/**
 * One place that maps a file name to how it is shown (icon + colour, like
 * VS Code) and how its contents are highlighted. Used by the explorer,
 * editor tabs, the editor itself and the AI file list.
 */

const DEFAULT_TYPE = { icon: "ri-file-code-line", color: "text-slate-400", language: "" };

// Matched on the file's extension.
const BY_EXTENSION = {
  js: { icon: "ri-javascript-fill", color: "text-yellow-400", language: "javascript" },
  mjs: { icon: "ri-javascript-fill", color: "text-yellow-400", language: "javascript" },
  cjs: { icon: "ri-javascript-fill", color: "text-yellow-400", language: "javascript" },
  jsx: { icon: "ri-reactjs-line", color: "text-cyan-400", language: "javascript" },
  ts: { icon: "ri-file-code-line", color: "text-blue-400", language: "typescript" },
  tsx: { icon: "ri-reactjs-line", color: "text-blue-400", language: "typescript" },
  json: { icon: "ri-braces-line", color: "text-amber-400", language: "json" },
  html: { icon: "ri-html5-fill", color: "text-orange-400", language: "html" },
  css: { icon: "ri-css3-fill", color: "text-sky-400", language: "css" },
  scss: { icon: "ri-css3-fill", color: "text-pink-400", language: "css" },
  md: { icon: "ri-markdown-line", color: "text-slate-300", language: "" },
  sh: { icon: "ri-terminal-box-line", color: "text-emerald-400", language: "bash" },
  py: { icon: "ri-file-code-line", color: "text-green-400", language: "python" },
  go: { icon: "ri-file-code-line", color: "text-cyan-300", language: "go" },
  rs: { icon: "ri-file-code-line", color: "text-orange-300", language: "rust" },
  svg: { icon: "ri-image-line", color: "text-purple-400", language: "html" },
  png: { icon: "ri-image-line", color: "text-purple-400", language: "" },
  jpg: { icon: "ri-image-line", color: "text-purple-400", language: "" },
  txt: { icon: "ri-file-text-line", color: "text-slate-400", language: "" },
  yml: { icon: "ri-file-list-line", color: "text-rose-300", language: "" },
  yaml: { icon: "ri-file-list-line", color: "text-rose-300", language: "" },
};

// Matched on the whole file name, for files without a useful extension.
const BY_NAME = {
  "package.json": { icon: "ri-nodejs-line", color: "text-lime-400", language: "json" },
  "package-lock.json": { icon: "ri-nodejs-line", color: "text-lime-600", language: "json" },
  ".env": { icon: "ri-file-lock-line", color: "text-yellow-300", language: "bash" },
  ".gitignore": { icon: "ri-git-branch-line", color: "text-orange-400", language: "" },
  dockerfile: { icon: "ri-database-2-line", color: "text-blue-300", language: "bash" },
};

export const getFileType = (path = "") => {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  const extension = name.includes(".") ? name.split(".").pop() : "";
  return BY_NAME[name] ?? BY_EXTENSION[extension] ?? DEFAULT_TYPE;
};

/** Highlight.js language for a file, or "" to auto-detect. */
export const getFileLanguage = (path) => getFileType(path).language;
