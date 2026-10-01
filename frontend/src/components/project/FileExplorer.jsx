import { useEffect, useRef, useState } from "react";
import FileIcon from "../ui/FileIcon";
import Avatar from "../ui/Avatar";

// Folders first, then files, each alphabetically - like an editor sidebar.
const sortEntries = (tree) =>
  Object.entries(tree ?? {}).sort(([aName, aNode], [bName, bNode]) => {
    const aIsDir = Boolean(aNode.directory);
    if (aIsDir !== Boolean(bNode.directory)) return aIsDir ? -1 : 1;
    return aName.localeCompare(bName);
  });

/** Inline editor for a new or renamed entry, used in place of the row. */
const NameInput = ({ defaultValue, error, onSubmit, onCancel }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Preselect the name but not its extension, like VS Code's rename.
    const dot = input.value.lastIndexOf(".");
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
  }, []);

  return (
    <form
      className="px-3 py-1"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(inputRef.current.value.trim());
      }}
    >
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        onBlur={onCancel}
        className="w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
};

/** Right-click / "..." menu for a file or folder. */
const RowMenu = ({ path, isFolder, position, onAction, onClose }) => {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  const items = [
    ...(isFolder ? [{ action: "new", icon: "ri-file-add-line", label: "New File" }] : []),
    { action: "rename", icon: "ri-edit-line", label: "Rename" },
    { action: "delete", icon: "ri-delete-bin-line", label: "Delete", danger: true },
  ];

  return (
    <div
      style={{ top: position.y, left: position.x }}
      onClick={(event) => event.stopPropagation()}
      className="fixed z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
    >
      {items.map(({ action, icon, label, danger }) => (
        <button
          key={action}
          onClick={() => {
            onAction(action, path);
            onClose();
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 ${
            danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"
          }`}
        >
          <i className={icon}></i>
          {label}
        </button>
      ))}
    </div>
  );
};

const TreeNodes = ({
  tree,
  basePath = "",
  depth = 0,
  currentFile,
  unsavedFiles,
  viewersByFile,
  renamingPath,
  renameError,
  onOpenFile,
  onOpenMenu,
  onRename,
  onCancelRename,
}) =>
  sortEntries(tree).map(([name, node]) => {
    const path = `${basePath}${name}`;
    const indent = { paddingLeft: `${12 + depth * 12}px` };

    if (renamingPath === path) {
      return (
        <div key={path} style={indent}>
          <NameInput
            defaultValue={name}
            error={renameError}
            onSubmit={(newName) => onRename(path, newName)}
            onCancel={onCancelRename}
          />
        </div>
      );
    }

    if (node.directory) {
      return (
        <div key={path}>
          <p
            onContextMenu={(event) => onOpenMenu(event, path, true)}
            className="group flex items-center gap-1.5 py-1.5 pr-2 text-sm font-medium text-slate-500"
            style={indent}
          >
            <i className="ri-folder-3-fill text-sky-300/80"></i>
            <span className="truncate">{name}</span>
            <button
              onClick={(event) => onOpenMenu(event, path, true)}
              className="ml-auto rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100"
              title="More actions"
            >
              <i className="ri-more-2-fill"></i>
            </button>
          </p>
          <TreeNodes
            tree={node.directory}
            basePath={`${path}/`}
            depth={depth + 1}
            currentFile={currentFile}
            unsavedFiles={unsavedFiles}
            viewersByFile={viewersByFile}
            renamingPath={renamingPath}
            renameError={renameError}
            onOpenFile={onOpenFile}
            onOpenMenu={onOpenMenu}
            onRename={onRename}
            onCancelRename={onCancelRename}
          />
        </div>
      );
    }

    if (!node.file) return null;

    const isActive = currentFile === path;
    return (
      <div
        key={path}
        onContextMenu={(event) => onOpenMenu(event, path, false)}
        className={`group flex w-full items-center gap-2 border-l-2 pr-2 text-sm transition-colors ${
          isActive
            ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
            : "border-transparent text-slate-700 hover:bg-slate-200"
        }`}
      >
        <button
          onClick={() => onOpenFile(path)}
          style={indent}
          className="flex min-w-0 flex-grow items-center gap-2 py-1.5 text-left"
        >
          <FileIcon path={path} />
          <span className="truncate">{name}</span>
        </button>

        <span className="flex shrink-0 items-center gap-1">
          {(viewersByFile?.get(path) ?? []).map((email) => (
            <Avatar key={email} email={email} size="sm" title={`${email} has this file open`} />
          ))}
          {unsavedFiles.has(path) && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
          <button
            onClick={(event) => onOpenMenu(event, path, false)}
            className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100"
            title="More actions"
          >
            <i className="ri-more-2-fill"></i>
          </button>
        </span>
      </div>
    );
  });

/**
 * Project file tree with VS Code-style management: right-click (or the
 * "..." button) to rename or delete, and create files inside a folder.
 * Nested paths like `src/index.js` create the folders automatically.
 */
const FileExplorer = ({
  fileTree,
  currentFile,
  unsavedFiles,
  viewersByFile,
  onOpenFile,
  onCreateFile,
  onRenamePath,
  onDeletePath,
}) => {
  const [creatingIn, setCreatingIn] = useState(null); // folder path, or "" for root
  const [renamingPath, setRenamingPath] = useState(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(null);

  const startCreating = (folder = "") => {
    setRenamingPath(null);
    setError("");
    setCreatingIn(folder);
  };

  const cancelEditing = () => {
    setCreatingIn(null);
    setRenamingPath(null);
    setError("");
  };

  const submitCreate = (name) => {
    const path = creatingIn ? `${creatingIn}/${name}` : name;
    const createError = onCreateFile(path);
    if (createError) return setError(createError);
    cancelEditing();
  };

  const submitRename = (path, newName) => {
    const parent = path.split("/").slice(0, -1).join("/");
    const renameError = onRenamePath(path, parent ? `${parent}/${newName}` : newName);
    if (renameError) return setError(renameError);
    cancelEditing();
  };

  const handleMenuAction = (action, path) => {
    if (action === "new") return startCreating(path);
    if (action === "rename") {
      setCreatingIn(null);
      setError("");
      return setRenamingPath(path);
    }
    if (action === "delete") onDeletePath(path);
  };

  const openMenu = (event, path, isFolder) => {
    event.preventDefault();
    event.stopPropagation();
    // Keep the menu on screen near the pointer.
    setMenu({ path, isFolder, position: { x: Math.min(event.clientX, window.innerWidth - 190), y: event.clientY } });
  };

  const isEmpty = Object.keys(fileTree ?? {}).length === 0;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Files</span>
        <button
          onClick={() => startCreating("")}
          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
          title="New file"
        >
          <i className="ri-file-add-line"></i>
        </button>
      </div>

      {creatingIn !== null && creatingIn === "" && (
        <NameInput
          defaultValue=""
          error={error}
          onSubmit={submitCreate}
          onCancel={cancelEditing}
        />
      )}

      <div className="scrollbar-none flex-1 overflow-y-auto pb-2">
        {isEmpty && creatingIn === null ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            <p>No files yet.</p>
            <button
              onClick={() => startCreating("")}
              className="mt-2 font-medium text-indigo-600 hover:underline"
            >
              Create a file
            </button>
            <p className="mt-1">or ask @ai in the chat</p>
          </div>
        ) : (
          <>
            <TreeNodes
              tree={fileTree}
              currentFile={currentFile}
              unsavedFiles={unsavedFiles}
              viewersByFile={viewersByFile}
              renamingPath={renamingPath}
              renameError={error}
              onOpenFile={onOpenFile}
              onOpenMenu={openMenu}
              onRename={submitRename}
              onCancelRename={cancelEditing}
            />
            {creatingIn && (
              <div style={{ paddingLeft: `${12 + creatingIn.split("/").length * 12}px` }}>
                <NameInput
                  defaultValue=""
                  error={error}
                  onSubmit={submitCreate}
                  onCancel={cancelEditing}
                />
              </div>
            )}
          </>
        )}
      </div>

      {menu && (
        <RowMenu
          path={menu.path}
          isFolder={menu.isFolder}
          position={menu.position}
          onAction={handleMenuAction}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  );
};

export default FileExplorer;
