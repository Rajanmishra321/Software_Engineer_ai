/**
 * Helpers for the WebContainer-style file tree used by projects:
 *   { "app.js": { file: { contents } }, "src": { directory: { ... } } }
 *
 * All helpers are pure: they never mutate the tree they receive, so the
 * result can be put straight into React state.
 */

const splitPath = (path) => path.split("/").filter(Boolean);

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
export const resolveStartCommand = (tree, aiStartCommand) => {
  if (aiStartCommand?.mainItem) {
    return { command: aiStartCommand.mainItem, args: aiStartCommand.commands ?? [] };
  }

  try {
    const packageJson = JSON.parse(getFileContent(tree, "package.json") ?? "{}");
    if (packageJson.scripts?.start) return { command: "npm", args: ["start"] };
  } catch {
    // Invalid package.json - fall through to the entry-file heuristics.
  }

  const entry = ["index.js", "app.js", "server.js", "main.js"].find(
    (name) => getFileContent(tree, name) !== undefined
  );
  return entry ? { command: "node", args: [entry] } : { command: "npm", args: ["start"] };
};
