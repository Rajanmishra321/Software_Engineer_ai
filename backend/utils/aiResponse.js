/**
 * Turns a raw Gemini reply into the message shape the frontend consumes:
 *   { text, fileTree?, startCommand?: { mainItem, commands } }
 *
 * The model is asked for `{ text, files: [{ path, contents }], startCommand }`
 * (a flat file list is far easier for it to produce reliably than a deeply
 * nested tree), and this module validates that and builds the WebContainer
 * file tree. Anything unusable throws, so the caller can try another model
 * instead of sending raw JSON to the chat.
 */

export class InvalidAiResponseError extends Error {}

const stripCodeFences = (raw) =>
  raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

const parseJsonObject = (raw) => {
  const value = JSON.parse(stripCodeFences(raw));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidAiResponseError("AI response is not a JSON object");
  }
  return value;
};

/** Normalises a relative file path; returns null for unsafe or empty paths. */
const normalizePath = (path) => {
  if (typeof path !== "string") return null;
  const parts = path.replace(/\\/g, "/").split("/").filter((part) => part && part !== ".");
  if (parts.length === 0 || parts.includes("..")) return null;
  return parts.join("/");
};

/** Builds `{ name: { file: { contents } } | { directory: {...} } }` from a flat list. */
export const filesToTree = (files) => {
  const tree = {};

  for (const { path, contents } of files) {
    const parts = path.split("/");
    const fileName = parts.pop();
    let node = tree;
    let conflict = false;

    for (const dir of parts) {
      node[dir] ??= { directory: {} };
      if (!node[dir].directory) {
        conflict = true; // a file already occupies this folder name
        break;
      }
      node = node[dir].directory;
    }

    if (!conflict && !node[fileName]?.directory) {
      node[fileName] = { file: { contents } };
    }
  }

  return tree;
};

// Older prompt format: a nested WebContainer tree. Flatten it so both
// formats go through the same validation.
const flattenTree = (tree, basePath = "") =>
  Object.entries(tree ?? {}).flatMap(([name, node]) => {
    if (node?.directory) return flattenTree(node.directory, `${basePath}${name}/`);
    if (node?.file) return [{ path: `${basePath}${name}`, contents: node.file.contents }];
    return [];
  });

const collectFiles = (response) => {
  const rawFiles = Array.isArray(response.files)
    ? response.files
    : response.fileTree && typeof response.fileTree === "object"
      ? flattenTree(response.fileTree)
      : [];

  return rawFiles
    .map((file) => ({ path: normalizePath(file?.path), contents: file?.contents }))
    .filter((file) => file.path && typeof file.contents === "string");
};

/** "npm install && npm run dev" -> { mainItem: "npm", commands: ["run", "dev"] } */
const parseStartCommand = (command) => {
  if (command && typeof command === "object" && typeof command.mainItem === "string") {
    command = [command.mainItem, ...(Array.isArray(command.commands) ? command.commands : [])].join(" ");
  }
  if (typeof command !== "string") return undefined;

  // Dependencies are installed separately before starting, so only the last
  // step of a chained command is the actual start command.
  const lastStep = command.split("&&").pop().trim();
  const [mainItem, ...commands] = lastStep.split(/\s+/).filter(Boolean);
  return mainItem ? { mainItem, commands } : undefined;
};

export const normalizeAiResponse = (raw) => {
  let response;
  try {
    response = parseJsonObject(raw);
  } catch (error) {
    if (error instanceof InvalidAiResponseError) throw error;
    throw new InvalidAiResponseError(`AI response is not valid JSON: ${error.message}`);
  }

  // Some replies double-encode: the whole payload serialised inside `text`.
  if (typeof response.text === "string" && response.text.trim().startsWith("{")) {
    try {
      const nested = parseJsonObject(response.text);
      if ("files" in nested || "fileTree" in nested) response = nested;
    } catch {
      // `text` is just prose that happens to start with "{".
    }
  }

  if (typeof response.text !== "string" || !response.text.trim()) {
    throw new InvalidAiResponseError("AI response has no text");
  }

  const files = collectFiles(response);
  const normalized = { text: response.text };

  if (files.length > 0) {
    normalized.fileTree = filesToTree(files);
    const startCommand = parseStartCommand(response.startCommand);
    if (startCommand) normalized.startCommand = startCommand;
  }

  return normalized;
};
