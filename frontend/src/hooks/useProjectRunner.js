import { useCallback, useEffect, useRef, useState } from "react";
import { getWebContainer } from "../config/webContainer";
import { getFileContent, resolveStartCommand } from "../utils/fileTree";

export const RUN_STATUS = {
  IDLE: "idle",
  BOOTING: "booting",
  INSTALLING: "installing",
  STARTING: "starting",
  RUNNING: "running",
  ERROR: "error",
};

const MAX_OUTPUT_CHUNKS = 500;
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

  const processRef = useRef(null);
  const isMountedRef = useRef(false);

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
        // Always mount the latest tree so the run uses current editor contents.
        await container.mount(tree);
        isMountedRef.current = true;

        if (getFileContent(tree, "package.json") !== undefined) {
          setStatus(RUN_STATUS.INSTALLING);
          appendOutput("> npm install\n");
          const install = await container.spawn("npm", ["install"]);
          pipeOutput(install);
          const installCode = await install.exit;
          if (installCode !== 0) {
            appendOutput(`\nnpm install failed with exit code ${installCode}\n`);
            setStatus(RUN_STATUS.ERROR);
            return;
          }
        }

        const { command, args } = resolveStartCommand(tree, aiStartCommand);
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
    [appendOutput, pipeOutput, stop]
  );

  return {
    status,
    output,
    previewUrl,
    setPreviewUrl,
    clearOutput: () => setOutput([]),
    mountTree,
    writeFile,
    run,
    stop,
  };
};

export default useProjectRunner;
