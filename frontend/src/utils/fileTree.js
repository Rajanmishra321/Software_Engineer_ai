/**
 * Helpers for the WebContainer-style file tree used by projects:
 *   { "app.js": { file: { contents } }, "src": { directory: { ... } } }
 *
 * All helpers are pure: they never mutate the tree they receive, so the
 * result can be put straight into React state.
 */

const splitPath = (path) => path.split("/").filter(Boolean);

/**
 * Short fingerprint of a file's contents (djb2). Collaborators send the
 * fingerprint of the version they edited, so a receiver can tell whether an
 * update builds on what it already has or was made from a different copy.
 */
export const hashContent = (content = "") => {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
  }
  return String(hash);
};

/** Returns the file node's contents at `path`, or undefined if it isn't a file. */
export const getFileContent = (tree, path) => {
  let node = { directory: tree };
  for (const part of splitPath(path)) {
    node = node?.directory?.[part];
  }
  return node?.file?.contents;
};

/** True if `path` exists in the tree as a file or directory. */
export const pathExists = (tree, path) => {
  let node = { directory: tree };
  for (const part of splitPath(path)) {
    node = node?.directory?.[part];
    if (!node) return false;
  }
  return true;
};

/**
 * Returns a new tree with the file at `path` set to `contents`, creating
 * any missing parent directories. Returns the original tree if `path`
 * collides with an existing directory (or a file used as a directory).
 */
export const setFileContent = (tree, path, contents) => {
  const [head, ...rest] = splitPath(path);
  if (!head) return tree;

  const node = tree?.[head];

  if (rest.length === 0) {
    if (node?.directory) return tree;
    return { ...tree, [head]: { file: { contents } } };
  }

  if (node?.file) return tree;
  const updatedDirectory = setFileContent(node?.directory ?? {}, rest.join("/"), contents);
  return { ...tree, [head]: { directory: updatedDirectory } };
};

/** Returns the node (file or directory) at `path`, or undefined. */
export const getNode = (tree, path) => {
  let node = { directory: tree };
  for (const part of splitPath(path)) {
    node = node?.directory?.[part];
    if (!node) return undefined;
  }
  return node;
};

export const isDirectory = (tree, path) => Boolean(getNode(tree, path)?.directory);

/** Returns a new tree with the file or folder at `path` removed. */
export const removePath = (tree, path) => {
  const [head, ...rest] = splitPath(path);
  if (!head || !tree?.[head]) return tree;

  if (rest.length === 0) return omitKey(tree, head);

  const directory = tree[head].directory;
  if (!directory) return tree;
  return { ...tree, [head]: { directory: removePath(directory, rest.join("/")) } };
};

const omitKey = (object, key) =>
  Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));

/**
 * Moves (renames) a file or folder. Returns the original tree if the source
 * is missing or the destination is taken.
 */
export const movePath = (tree, from, to) => {
  const node = getNode(tree, from);
  if (!node || !from || !to || from === to) return tree;
  if (getNode(tree, to)) return tree;
  // Moving a folder inside itself would delete it.
  if (`${to}/`.startsWith(`${from}/`)) return tree;

  const withoutSource = removePath(tree, from);
  return insertNode(withoutSource, to, node);
};

/** Places an existing node at `path`, creating parent directories. */
const insertNode = (tree, path, node) => {
  const [head, ...rest] = splitPath(path);
  if (!head) return tree;

  if (rest.length === 0) return { ...tree, [head]: node };

  const directory = tree?.[head]?.directory ?? {};
  return { ...tree, [head]: { directory: insertNode(directory, rest.join("/"), node) } };
};

/** Lists every file path in the tree, depth-first, in insertion order. */
export const listFilePaths = (tree, basePath = "") =>
  Object.entries(tree ?? {}).flatMap(([name, node]) => {
    const path = `${basePath}${name}`;
    if (node.directory) return listFilePaths(node.directory, `${path}/`);
    return node.file ? [path] : [];
  });

// Files most worth showing first when a project is generated, in order.
const ENTRY_FILES = [
  "src/App.jsx", "src/App.tsx", "src/App.js", "src/main.jsx", "src/index.js",
  "app.js", "server.js", "index.js", "main.js",
];

/** Chooses which file to open first: a known entry file, else the first code file. */
export const pickEntryFile = (paths) =>
  ENTRY_FILES.find((entry) => paths.includes(entry)) ??
  paths.find((path) => /\.(jsx?|tsx?)$/.test(path)) ??
  paths[0] ??
  null;

/**
 * Picks the command used to start the project:
 * 1. an explicit command from the AI response, if any
 * 2. `npm start` when package.json defines a start script
 * 3. `node <entry>` for a common entry file
 */
const PACKAGE_MANAGERS = new Set(["npm", "yarn", "pnpm"]);
// Scripts to try when nothing else identifies how the project starts.
const START_SCRIPTS = ["dev", "start", "serve", "develop"];
const ENTRY_POINTS = ["index.js", "app.js", "server.js", "main.js"];

const readScripts = (tree) => {
  try {
    return JSON.parse(getFileContent(tree, "package.json") ?? "{}").scripts ?? {};
  } catch {
    return {}; // invalid package.json
  }
};

/** "npm run dev" / "npm start" -> "dev" / "start"; null for anything else. */
const scriptNameOf = (command, args) => {
  if (!PACKAGE_MANAGERS.has(command)) return null;
  if (args[0] === "run") return args[1] ?? null;
  if (command === "npm") return args[0] === "start" ? "start" : null;
  return args[0] ?? null; // yarn dev / pnpm dev
};

/**
 * Works out how to start the project, returning { command, args } or null
 * when nothing can run it.
 *
 * The AI's suggested command is only used if it actually exists in the
 * project - otherwise a reply suggesting "npm start" for a package.json
 * without a start script fails with npm's "Missing script" error.
 */
export const resolveStartCommand = (tree, aiStartCommand) => {
  const scripts = readScripts(tree);
  const fileExists = (path) => getFileContent(tree, path) !== undefined;

  if (aiStartCommand?.mainItem) {
    const command = aiStartCommand.mainItem;
    const args = aiStartCommand.commands ?? [];
    const scriptName = scriptNameOf(command, args);

    if (scriptName) {
      if (scripts[scriptName]) return { command, args };
    } else if (command !== "node" || fileExists(args[0])) {
      return { command, args };
    }
  }

  const script = START_SCRIPTS.find((name) => scripts[name]);
  if (script) return { command: "npm", args: ["run", script] };

  const entry = ENTRY_POINTS.find(fileExists);
  if (entry) return { command: "node", args: [entry] };

  return null;
};
