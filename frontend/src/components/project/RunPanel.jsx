import { useEffect, useRef } from "react";
import { RUN_STATUS } from "../../hooks/useProjectRunner";

const STATUS_LABELS = {
  [RUN_STATUS.BOOTING]: "Starting runtime...",
  [RUN_STATUS.INSTALLING]: "Installing dependencies...",
  [RUN_STATUS.STARTING]: "Starting app...",
  [RUN_STATUS.RUNNING]: "Running",
  [RUN_STATUS.ERROR]: "Failed",
};

const BUSY_STATUSES = new Set([RUN_STATUS.BOOTING, RUN_STATUS.INSTALLING, RUN_STATUS.STARTING]);

/** Run/Stop controls shown in the editor toolbar. */
export const RunControls = ({ status, disabled, onRun, onStop }) => {
  const busy = BUSY_STATUSES.has(status);
  const isActive = busy || status === RUN_STATUS.RUNNING;

  return (
    <>
      {status !== RUN_STATUS.IDLE && (
        <span
          className={`hidden text-xs sm:inline ${
            status === RUN_STATUS.ERROR ? "text-red-400" : "text-slate-400"
          }`}
        >
          {STATUS_LABELS[status]}
        </span>
      )}
      {isActive && (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 rounded-md bg-white/10 p-1.5 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/20"
        >
          <i className="ri-stop-fill"></i> Stop
        </button>
      )}
      <button
        onClick={onRun}
        disabled={disabled || busy}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 p-1.5 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <i className={busy ? "ri-loader-4-line animate-spin" : "ri-play-fill"}></i>
        {status === RUN_STATUS.RUNNING ? "Restart" : "Run"}
      </button>
    </>
  );
};

/** Collapsible terminal output of npm install / start. */
export const RunOutput = ({ lines, isOpen, onToggle, onClear }) => {
  const outputRef = useRef(null);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, isOpen]);

  return (
    <div className="shrink-0 border-t border-black/40 bg-[#181818]">
      <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-400">
        <button onClick={onToggle} className="flex items-center gap-1 uppercase tracking-wide hover:text-slate-200">
          <i className={isOpen ? "ri-arrow-down-s-line" : "ri-arrow-up-s-line"}></i>
          Terminal
        </button>
        {isOpen && lines.length > 0 && (
          <button onClick={onClear} className="hover:text-slate-200" title="Clear output">
            <i className="ri-delete-bin-line"></i>
          </button>
        )}
      </div>
      {isOpen && (
        <pre
          ref={outputRef}
          className="h-40 overflow-auto whitespace-pre-wrap break-words px-3 pb-2 font-mono text-xs text-slate-300"
        >
          {lines.length ? lines.join("") : "Output of Run will appear here."}
        </pre>
      )}
    </div>
  );
};

/** Live preview of the app's dev server inside the WebContainer. */
export const PreviewPane = ({ url, onUrlChange, onClose }) => (
  <div className="flex h-full w-[40%] min-w-80 shrink-0 flex-col border-l border-black/30 bg-white">
    <div className="flex items-center border-b border-black/30 bg-[#252526]">
      <input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="flex-1 bg-transparent p-2 px-3 text-sm text-slate-200 outline-none"
      />
      <button onClick={onClose} className="px-3 text-slate-400 hover:text-white" title="Close preview">
        <i className="ri-close-fill"></i>
      </button>
    </div>
    <iframe src={url} className="h-full w-full" title="App preview" />
  </div>
);
