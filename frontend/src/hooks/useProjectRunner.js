import { useCallback, useEffect, useRef, useState } from "react";
import { getWebContainer } from "../config/webContainer";
import { getFileContent, hashContent, resolveStartCommand } from "../utils/fileTree";

export const RUN_STATUS = {
  IDLE: "idle",
  BOOTING: "booting",
  INSTALLING: "installing",
  STARTING: "starting",
  RUNNING: "running",
  ERROR: "error",
};

const MAX_OUTPUT_CHUNKS = 500;

/** True when dependencies are already installed in the container. */
const hasNodeModules = async (container) => {
  try {
    const entries = await container.fs.readdir("node_modules");
    return entries.length > 0;
  } catch {
    return false; // not installed yet
  }
};
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;?]*[A-Za-z]/g;
// npm prints spinner frames as separate chunks; they're noise in a log view.
const SPINNER_ONLY = /^[\s\r⠀-⣿|/\\-]*$/;

/**
 * Owns the in-browser WebContainer for a project: mounting files, writing
 * edits, running `npm install` + the start command, and exposing status,
 * terminal output and the preview URL.
 */
const useProjectRunner = () => {
  const [status, setStatus] = useState(RUN_STATUS.IDLE);
  const [output, setOutput] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const processRef = useRef(null);
  const isMountedRef = useRef(false);
  // Fingerprints of what is already in the container, so repeat runs can
  // skip mounting and installing.
  const mountedHashRef = useRef(null);
  const installedHashRef = useRef(null);
  const installPromiseRef = useRef(null);

  const appendOutput = useCallback((chunk) => {
    const text = String(chunk).replace(ANSI_PATTERN, "");
    if (SPINNER_ONLY.test(text)) return;
    setOutput((prev) => [...prev, text].slice(-MAX_OUTPUT_CHUNKS));
  }, []);

  const pipeOutput = useCallback(
    (process) => {
      process.output
        .pipeTo(new WritableStream({ write: appendOutput }))
        .catch(() => {
          // The stream errors when the process is killed; nothing to report.
        });
    },
    [appendOutput]
  );

  // Boot early so Run starts quickly, and listen for the dev server.
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    getWebContainer()
      .then((container) => {
        if (cancelled) return;
        unsubscribe = container.on("server-ready", (port, url) => {
          setPreviewUrl(url);
          setStatus(RUN_STATUS.RUNNING);
          appendOutput(`\n> Server ready on port ${port}\n`);
        });
      })
      .catch((err) => console.error("Failed to boot WebContainer:", err));

    return () => {
      cancelled = true;
      unsubscribe();
      processRef.current?.kill();
      processRef.current = null;
    };
  }, [appendOutput]);

  const mountTree = useCallback(async (tree) => {
    try {
      const container = await getWebContainer();
      await container.mount(tree);
      mountedHashRef.current = hashContent(JSON.stringify(tree));
      isMountedRef.current = true;
    } catch (err) {
      console.error("Error mounting file tree:", err);
    }
  }, []);

  /** Writes one file into the container if the project is already mounted. */
  const writeFile = useCallback(async (path, content) => {
    if (!isMountedRef.current) return; // the next Run mounts everything
    try {
      const container = await getWebContainer();
      const dir = path.split("/").slice(0, -1).join("/");
      if (dir) await container.fs.mkdir(dir, { recursive: true });
      await container.fs.writeFile(path, content);
    } catch (err) {
      console.error(`Error writing ${path} to WebContainer:`, err);
    }
  }, []);

  /** Renames a file or folder inside the container. */
  const renamePath = useCallback(async (from, to) => {
    if (!isMountedRef.current) return;
    try {
      const container = await getWebContainer();
      const dir = to.split("/").slice(0, -1).join("/");
      if (dir) await container.fs.mkdir(dir, { recursive: true });
      await container.fs.rename(from, to);
    } catch (err) {
      console.error(`Error renaming ${from} in WebContainer:`, err);
    }
  }, []);

  /** Deletes a file or folder inside the container. */
  const deletePath = useCallback(async (path) => {
    if (!isMountedRef.current) return;
    try {
      const container = await getWebContainer();
      await container.fs.rm(path, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting ${path} in WebContainer:`, err);
    }
  }, []);

  /**
   * Installs dependencies if they aren't already in place. Several callers
   * (the background prefetch and Run) share one in-flight install rather
   * than starting a second one.
   */
  const installDependencies = useCallback(
    async (packageJson) => {
      const container = await getWebContainer();
      const packageHash = hashContent(packageJson);

      if (packageHash === installedHashRef.current && (await hasNodeModules(container))) {
        return true;
      }
      if (installPromiseRef.current) return installPromiseRef.current;

      const task = (async () => {
        appendOutput("> npm install\n");
        const install = await container.spawn("npm", [
          "install",
          "--prefer-offline",
          "--no-audit",
          "--no-fund",
        ]);
        pipeOutput(install);
        const code = await install.exit;

        if (code !== 0) {
          appendOutput(`\nnpm install failed with exit code ${code}\n`);
          return false;
        }
        installedHashRef.current = packageHash;
        appendOutput("\n> dependencies ready\n");
        return true;
      })();

      installPromiseRef.current = task;
      try {
        return await task;
      } finally {
        installPromiseRef.current = null;
      }
    },
    [appendOutput, pipeOutput]
  );

  /**
   * Starts installing as soon as a project is opened, so the wait happens
   * while you read the code instead of after you press Run.
   */
  const prepareDependencies = useCallback(
    async (tree) => {
      const packageJson = getFileContent(tree, "package.json");
      if (packageJson === undefined) return;
      // Don't spend someone's data allowance on a project they may only read.
      if (navigator.connection?.saveData) return;

      setIsPreparing(true);
      try {
        await installDependencies(packageJson);
      } catch (err) {
        console.error("Error preparing dependencies:", err);
      } finally {
        setIsPreparing(false);
      }
    },
    [installDependencies]
  );

  const stop = useCallback(() => {
    processRef.current?.kill();
    processRef.current = null;
    setPreviewUrl(null);
    setStatus(RUN_STATUS.IDLE);
  }, []);

  const run = useCallback(
    async (tree, aiStartCommand) => {
      stop();
      setOutput([]);
      setStatus(RUN_STATUS.BOOTING);

      try {
        const container = await getWebContainer();

        // Only write the files again when they actually changed.
        const treeHash = hashContent(JSON.stringify(tree));
        if (treeHash !== mountedHashRef.current) {
          await container.mount(tree);
          mountedHashRef.current = treeHash;
          isMountedRef.current = true;
        }

        const packageJson = getFileContent(tree, "package.json");
        if (packageJson !== undefined) {
          // Usually a no-op: the install already ran in the background when
          // the project was opened, or nothing has changed since last time.
          const alreadyInstalled =
            hashContent(packageJson) === installedHashRef.current &&
            !installPromiseRef.current &&
            (await hasNodeModules(container));

          if (alreadyInstalled) {
            appendOutput("> dependencies ready, skipping npm install\n");
          } else {
            setStatus(RUN_STATUS.INSTALLING);
            const installed = await installDependencies(packageJson);
            if (!installed) {
              setStatus(RUN_STATUS.ERROR);
              return;
            }
          }
        }

        const startCommand = resolveStartCommand(tree, aiStartCommand);
        if (!startCommand) {
          appendOutput(
            '\nNothing to run: add a "start" or "dev" script to package.json, ' +
              "or an entry file such as index.js.\n"
          );
          setStatus(RUN_STATUS.ERROR);
          return;
        }

        const { command, args } = startCommand;
        setStatus(RUN_STATUS.STARTING);
        appendOutput(`\n> ${[command, ...args].join(" ")}\n`);

        const process = await container.spawn(command, args);
        processRef.current = process;
        pipeOutput(process);

        process.exit.then((code) => {
          // Ignore exits of processes we already replaced or stopped.
          if (processRef.current !== process) return;
          processRef.current = null;
          appendOutput(`\nProcess exited with code ${code}\n`);
          setStatus(code === 0 ? RUN_STATUS.IDLE : RUN_STATUS.ERROR);
        });
      } catch (err) {
        console.error("Error running project:", err);
        appendOutput(`\n${err.message}\n`);
        setStatus(RUN_STATUS.ERROR);
      }
    },
    [appendOutput, pipeOutput, stop, installDependencies]
  );

  return {
    status,
    output,
    isPreparing,
    prepareDependencies,
    previewUrl,
    setPreviewUrl,
    clearOutput: () => setOutput([]),
    mountTree,
    writeFile,
    renamePath,
    deletePath,
    run,
    stop,
  };
};

export default useProjectRunner;
