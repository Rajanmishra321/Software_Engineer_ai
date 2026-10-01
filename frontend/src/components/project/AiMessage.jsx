import { Children, isValidElement, useMemo } from "react";
import Markdown from "markdown-to-jsx";
import { highlightCode } from "../../config/highlight";
import { parseMessage } from "../../utils/messages";
import { listFilePaths } from "../../utils/fileTree";
import FileIcon from "../ui/FileIcon";

// markdown-to-jsx marks fenced code blocks with a `lang-<name>` class.
const getLanguage = (className = "") =>
  className.match(/(?:lang|language)-(\S+)/)?.[1] ?? "";

const CodeBlock = ({ code, language }) => {
  const html = useMemo(() => highlightCode(code, language), [code, language]);

  return (
    <div className="relative my-2 overflow-hidden rounded-lg bg-[#0d1117]">
      {language && (
        <span className="absolute right-2 top-2 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
          {language}
        </span>
      )}
      <pre className="overflow-x-auto p-4 pt-8 text-xs leading-relaxed">
        <code className="hljs !bg-transparent !p-0" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
};

// Overriding <pre> (not <code>) keeps inline `code` spans inline: only
// fenced blocks are wrapped in <pre> by markdown-to-jsx.
const PreBlock = ({ children }) => {
  const codeElement = Children.toArray(children).find(isValidElement);
  const { className, children: code } = codeElement?.props ?? {};
  return <CodeBlock code={Children.toArray(code).join("")} language={getLanguage(className)} />;
};

const InlineCode = ({ children }) => (
  <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
);

const MARKDOWN_OPTIONS = {
  overrides: {
    pre: { component: PreBlock },
    code: { component: InlineCode },
  },
};

const GeneratedFiles = ({ paths, onOpenFile }) => (
  <div className="mt-3 border-t border-white/10 pt-2">
    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <i className="ri-folder-add-line"></i>
      Created {paths.length} file{paths.length === 1 ? "" : "s"} in the editor
    </p>
    <ul className="max-h-40 overflow-y-auto">
      {paths.map((path) => (
        <li key={path}>
          <button
            onClick={() => onOpenFile?.(path)}
            className="flex w-full items-center gap-1.5 truncate rounded px-1 py-0.5 text-left font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <FileIcon path={path} />
            {path}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Renders an AI reply: the backend sends JSON with a markdown `text` field
 * and, for code requests, a `fileTree` that is loaded into the editor.
 */
const AiMessage = ({ message, onOpenFile }) => {
  const { text, fileTree } = parseMessage(message);
  const filePaths = useMemo(() => listFilePaths(fileTree), [fileTree]);

  return (
    <div className="ai-message overflow-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-100 shadow-md">
      <Markdown options={MARKDOWN_OPTIONS}>{text || ""}</Markdown>
      {filePaths.length > 0 && <GeneratedFiles paths={filePaths} onOpenFile={onOpenFile} />}
    </div>
  );
};

export default AiMessage;
