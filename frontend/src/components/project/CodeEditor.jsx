const TAB = "  ";

const EditorTabs = ({ openFiles, currentFile, unsavedFiles, onSelect, onClose }) => (
  <div className="scrollbar-none flex overflow-x-auto">
    {openFiles.map((path) => {
      const isActive = currentFile === path;
      return (
        <div
          key={path}
          onClick={() => onSelect(path)}
          title={path}
          className={`flex min-w-fit cursor-pointer items-center gap-2 border-r border-black/30 p-2 px-4 text-sm ${
            isActive ? "bg-[#1E1E1E] text-white" : "text-slate-400 hover:bg-white/5"
          }`}
        >
          <span className="font-medium">{path.split("/").pop()}</span>
          {unsavedFiles.has(path) && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(path);
            }}
            className="rounded-full p-0.5 leading-none text-slate-500 hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <i className="ri-close-fill"></i>
          </button>
        </div>
      );
    })}
  </div>
);

const EmptyEditor = ({ hasFiles }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
    <i className="ri-code-s-slash-line text-5xl text-slate-600"></i>
    <p className="text-base font-medium text-slate-300">
      {hasFiles ? "Select a file to start editing" : "This project has no files yet"}
    </p>
    <p className="max-w-sm text-sm">
      {hasFiles
        ? "Pick a file from the explorer on the left."
        : "Click the new-file icon in the explorer to create one, or ask the AI in the chat, e.g. “@ai create an express server”."}
    </p>
  </div>
);

/**
 * Tabbed code editor. A plain textarea keeps it dependency-free; Tab and
 * Shift+Tab indent/outdent instead of moving focus out of the editor.
 */
const CodeEditor = ({
  openFiles,
  currentFile,
  content,
  unsavedFiles,
  hasFiles,
  toolbar,
  onSelectFile,
  onCloseFile,
  onChange,
}) => {
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const textarea = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = textarea;

    if (e.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (value.startsWith(TAB, lineStart)) {
        onChange(value.slice(0, lineStart) + value.slice(lineStart + TAB.length));
        requestAnimationFrame(() => {
          const caret = Math.max(lineStart, start - TAB.length);
          textarea.selectionStart = textarea.selectionEnd = caret;
        });
      }
      return;
    }

    onChange(value.slice(0, start) + TAB + value.slice(end));
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + TAB.length;
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-grow flex-col bg-[#1E1E1E]">
      <div className="flex min-h-[41px] items-center justify-between border-b border-black/30 bg-[#252526]">
        <EditorTabs
          openFiles={openFiles}
          currentFile={currentFile}
          unsavedFiles={unsavedFiles}
          onSelect={onSelectFile}
          onClose={onCloseFile}
        />
        <div className="flex shrink-0 items-center gap-2 px-2">{toolbar}</div>
      </div>

      {currentFile ? (
        <textarea
          key={currentFile}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Start typing your code..."
          className="h-full w-full flex-grow resize-none bg-[#1E1E1E] p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder-slate-600"
          style={{ tabSize: 2 }}
        />
      ) : (
        <EmptyEditor hasFiles={hasFiles} />
      )}
    </div>
  );
};

export default CodeEditor;
