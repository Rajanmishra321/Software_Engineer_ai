import { useEffect, useRef, useState } from "react";
import AiMessage from "./AiMessage";
import MessageTicks from "./MessageTicks";
import { AI_SENDER_EMAIL } from "../../utils/messages";
import { getMessageStatus } from "../../utils/messageStatus";

const ChatMessage = ({ msg, status, onOpenFile }) => {
  const isAi = msg.sender?.email === AI_SENDER_EMAIL;

  const bubbleClasses = msg.isOutgoing
    ? "ml-auto bg-indigo-600 text-white"
    : isAi
      ? "max-w-full bg-slate-100 text-slate-800"
      : "bg-slate-100 text-slate-800";

  return (
    <div className={`flex w-fit max-w-[85%] flex-col gap-1 rounded-xl p-2 px-3 shadow-sm ${bubbleClasses}`}>
      <small className={`text-xs ${msg.isOutgoing ? "text-indigo-100" : "text-slate-500"}`}>
        {isAi ? "AI" : msg.sender?.email}
      </small>
      {isAi ? (
        <AiMessage message={msg.message} onOpenFile={onOpenFile} />
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>
      )}
      {msg.isOutgoing && (
        <span className="-mb-0.5 mt-0.5 self-end">
          <MessageTicks status={status} />
        </span>
      )}
    </div>
  );
};

const EmptyChat = () => (
  <div className="m-auto max-w-xs px-6 text-center text-sm text-slate-400">
    <i className="ri-chat-3-line mb-2 block text-3xl text-slate-300"></i>
    <p className="font-medium text-slate-500">No messages yet</p>
    <p className="mt-1">
      Chat with collaborators, or start a message with{" "}
      <code className="rounded bg-slate-100 px-1 text-indigo-600">@ai</code> to generate code,
      e.g. <em>@ai create an express server</em>.
    </p>
  </div>
);

/** Message list plus the composer at the bottom of the left panel. */
const ChatPanel = ({ messages, recipientEmails = [], onSend, onOpenFile, isAiThinking }) => {
  const [draft, setDraft] = useState("");
  const messageBoxRef = useRef(null);

  useEffect(() => {
    const box = messageBoxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, isAiThinking]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter adds a newline; ignore Enter while an IME
    // composition (e.g. Hindi/Japanese input) is in progress.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-0 flex-grow flex-col">
      <div
        ref={messageBoxRef}
        className="scrollbar-none flex min-h-0 flex-grow flex-col gap-2 overflow-y-auto p-3 scroll-smooth"
      >
        {messages.length === 0 && !isAiThinking ? (
          <EmptyChat />
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.key}
              msg={msg}
              status={msg.isOutgoing ? getMessageStatus(msg, recipientEmails) : undefined}
              onOpenFile={onOpenFile}
            />
          ))
        )}
        {isAiThinking && (
          <div className="flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
            <i className="ri-sparkling-2-line animate-pulse text-indigo-500"></i>
            AI is thinking...
          </div>
        )}
      </div>

      <div className="flex items-end border-t border-slate-200 bg-white">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message, or @ai to generate code"
          className="max-h-32 flex-grow resize-none border-none p-3 px-5 text-sm outline-none placeholder-slate-400"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="h-[46px] bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          title="Send"
        >
          <i className="ri-send-plane-fill"></i>
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
