import { useMemo, useRef } from "react";
import { highlightCode } from "../../config/highlight";
import { getFileLanguage } from "../../utils/fileTypes";
import FileIcon from "../ui/FileIcon";

const TAB = "  ";

// Highlighting a very large file on every keystroke would lag, so past this
// size the editor shows plain (still editable) text.
const MAX_HIGHLIGHT_LENGTH = 100_000;

// The highlighted layer and the textarea must render text identically or the
// colours drift out of line with the caret.
const EDITOR_TEXT_CLASSES = "p-4 font-mono text-sm leading-6 whitespace-pre-wrap break-words";

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
          <FileIcon path={path} />
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
 * Shown when a collaborator saved a file while you had unsaved edits in it.
 * Their version is held back rather than wiping out what you typed.
 */
const ConflictBanner = ({ conflict, onAccept, onDismiss }) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
    <i className="ri-git-merge-line text-sm"></i>
    <span className="flex-grow">
      <strong className="font-semibold">{conflict.email}</strong> saved a newer version of this file
      while you were editing.
    </span>
    <button
      onClick={onAccept}
      className="rounded-md bg-amber-500 px-2 py-1 font-medium text-slate-900 hover:bg-amber-400"
    >
      Load their version
    </button>
    <button onClick={onDismiss} className="rounded-md px-2 py-1 font-medium hover:bg-white/10">
      Keep mine
    </button>
  </div>
);

/**
 * Syntax-highlighted editing surface: a transparent textarea sits on top of
 * a highlighted copy of the same text, so editing behaves exactly like a
 * plain textarea (caret, selection, undo, spellcheck off) while the colours
 * come from highlight.js underneath.
 */
const HighlightedInput = ({ path, content, onChange, onKeyDown }) => {
  const highlightRef = useRef(null);

  const html = useMemo(() => {
    if (content.length > MAX_HIGHLIGHT_LENGTH) return null;
    // The trailing newline keeps the last line's height in step with the
    // textarea, which always reserves room after a final newline.
    return `${highlightCode(content, getFileLanguage(path))}\n`;
  }, [content, path]);

  // Keep the colours aligned with the text as the textarea scrolls.
  const syncScroll = (e) => {
    const layer = highlightRef.current;
    if (!layer) return;
    layer.scrollTop = e.currentTarget.scrollTop;
    layer.scrollLeft = e.currentTarget.scrollLeft;
  };

  return (
    <div className="relative min-h-0 flex-grow overflow-hidden bg-[#1E1E1E]">
      {html !== null && (
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className={`hljs pointer-events-none absolute inset-0 m-0 overflow-hidden !bg-transparent ${EDITOR_TEXT_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Start typing your code..."
        className={`absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent caret-white outline-none placeholder-slate-600 ${EDITOR_TEXT_CLASSES} ${
          html === null ? "text-slate-100" : "text-transparent"
        }`}
        style={{ tabSize: 2 }}
      />
    </div>
  );
};

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
  conflict,
  onSelectFile,
  onCloseFile,
  onChange,
  onAcceptConflict,
  onDismissConflict,
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

      {currentFile && conflict && (
        <ConflictBanner
          conflict={conflict}
          onAccept={() => onAcceptConflict(currentFile)}
          onDismiss={() => onDismissConflict(currentFile)}
        />
      )}

      {currentFile ? (
        <HighlightedInput
          key={currentFile}
          path={currentFile}
          content={content}
          onChange={onChange}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <EmptyEditor hasFiles={hasFiles} />
      )}
    </div>
  );
};

export default CodeEditor;
