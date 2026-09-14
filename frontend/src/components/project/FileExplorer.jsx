import { useState } from "react";

const TreeNodes = ({ tree, basePath = "", depth = 0, currentFile, unsavedFiles, onOpenFile }) =>
  Object.entries(tree ?? {}).map(([name, node]) => {
    const path = `${basePath}${name}`;
    const indent = { paddingLeft: `${12 + depth * 12}px` };

    if (node.directory) {
      return (
        <div key={path}>
          <p className="flex items-center gap-1.5 py-1.5 text-sm font-medium text-slate-500" style={indent}>
            <i className="ri-folder-3-line"></i>
            {name}
          </p>
          <TreeNodes
            tree={node.directory}
            basePath={`${path}/`}
            depth={depth + 1}
            currentFile={currentFile}
            unsavedFiles={unsavedFiles}
            onOpenFile={onOpenFile}
          />
        </div>
      );
    }

    if (!node.file) return null;

    const isActive = currentFile === path;
    return (
      <button
        key={path}
        onClick={() => onOpenFile(path)}
        style={indent}
        className={`flex w-full items-center gap-2 border-l-2 py-1.5 pr-3 text-left text-sm transition-colors ${
          isActive
            ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
            : "border-transparent text-slate-700 hover:bg-slate-200"
        }`}
      >
        <i className="ri-file-code-line text-slate-400"></i>
        <span className="truncate">{name}</span>
        {unsavedFiles.has(path) && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
        )}
      </button>
    );
  });

/**
 * Project file tree with an inline "new file" input. Nested paths like
 * `src/index.js` create the folders automatically.
 */
const FileExplorer = ({ fileTree, currentFile, unsavedFiles, onOpenFile, onCreateFile }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");

  const cancelCreate = () => {
    setIsCreating(false);
    setNewFileName("");
    setError("");
  };

  const submitCreate = (e) => {
    e.preventDefault();
    const createError = onCreateFile(newFileName.trim());
    if (createError) {
      setError(createError);
      return;
    }
    cancelCreate();
  };

  const isEmpty = Object.keys(fileTree ?? {}).length === 0;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Files</span>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
          title="New file"
        >
          <i className="ri-file-add-line"></i>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={submitCreate} className="px-3 pb-2">
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => {
              setNewFileName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Escape" && cancelCreate()}
            onBlur={() => !newFileName.trim() && cancelCreate()}
            placeholder="e.g. index.js or src/app.js"
            className="w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </form>
      )}

      <div className="scrollbar-none flex-1 overflow-y-auto pb-2">
        {isEmpty && !isCreating ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            <p>No files yet.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 font-medium text-indigo-600 hover:underline"
            >
              Create a file
            </button>
            <p className="mt-1">or ask @ai in the chat</p>
          </div>
        ) : (
          <TreeNodes
            tree={fileTree}
            currentFile={currentFile}
            unsavedFiles={unsavedFiles}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    </aside>
  );
};

export default FileExplorer;
