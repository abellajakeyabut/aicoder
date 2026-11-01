"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { SendHorizontal, Sparkles, X } from "lucide-react";
import { sendChat, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  boardId: number;
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onBoardUpdate: (board: BoardData) => void;
};

export const ChatSidebar = ({ boardId, open, onClose, loading, onLoadingChange, onBoardUpdate }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) {
      return;
    }
    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setInput("");
    setError(false);
    onLoadingChange(true);
    try {
      const { reply, board } = await sendChat(boardId, message, history);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (board) {
        onBoardUpdate(board);
      }
    } catch {
      // Drop the unanswered message from the history and put it back in the input to retry
      setMessages(history);
      setInput(message);
      setError(true);
    } finally {
      onLoadingChange(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  // Enter sends, Shift+Enter adds a new line
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <aside
      aria-label="AI chat"
      className="sticky top-0 flex h-screen w-[340px] shrink-0 flex-col border-l border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--stroke)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--navy-dark)] text-[var(--accent-yellow)]">
            <Sparkles size={17} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight text-[var(--navy-dark)]">Board chat</h2>
            <p className="text-xs text-[var(--gray-text)]">AI assistant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
        >
          <X size={18} />
        </button>
      </div>
      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm leading-6 text-[var(--gray-text)]">
            Ask me to add, edit or move cards, or ask anything about the board.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={clsx(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
              message.role === "user"
                ? "self-end rounded-br-md bg-[var(--primary-blue)] text-white"
                : "self-start rounded-bl-md border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]"
            )}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <p role="status" className="self-start text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Thinking...
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-[var(--secondary-purple)]">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-[var(--stroke)] p-5">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message"
          placeholder="Ask the AI to update your board..."
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--secondary-purple)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal size={15} />
          Send
        </button>
      </form>
    </aside>
  );
};
