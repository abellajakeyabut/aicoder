"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { sendChat, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onBoardUpdate: (board: BoardData) => void;
};

export const ChatSidebar = ({ loading, onLoadingChange, onBoardUpdate }: ChatSidebarProps) => {
  const [open, setOpen] = useState(false);
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
      const { reply, board } = await sendChat(message, history);
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
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-10 flex items-center gap-2 rounded-full bg-[var(--navy-dark)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white shadow-[var(--shadow)] transition hover:brightness-125"
      >
        <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
        Open AI chat
      </button>
    );
  }

  return (
    <aside
      aria-label="AI chat"
      className="sticky top-0 flex h-screen w-[360px] shrink-0 flex-col border-l border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--stroke)] p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            AI Assistant
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
            Board chat
          </h2>
          <div className="mt-3 h-1 w-10 rounded-full bg-[var(--accent-yellow)]" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-full border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)]"
        >
          Close
        </button>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-[var(--stroke)] p-6">
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
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
