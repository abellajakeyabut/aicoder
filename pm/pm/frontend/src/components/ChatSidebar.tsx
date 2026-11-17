"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { SendHorizontal, Sparkles, X } from "lucide-react";
import { sendChat, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import { errorClass } from "@/components/ui";

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
      className="sticky top-0 flex h-screen w-[340px] shrink-0 flex-col border-l-4 border-[var(--navy-dark)] bg-[var(--sky-pale)]"
    >
      <div className="flex items-center justify-between gap-4 border-b-4 border-[var(--navy-dark)] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-[var(--secondary-purple)] text-white shadow-[inset_-3px_-3px_0_#00000026,0_0_0_3px_var(--navy-dark)]">
            <Sparkles size={17} />
          </div>
          <div>
            <h2 className="font-display text-[11px] leading-relaxed text-[var(--navy-dark)]">Board chat</h2>
            <p className="font-mono text-[11px] font-bold uppercase text-[var(--ink-soft)]">AI assistant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
          className="icon-btn h-9 w-9"
        >
          <X size={18} />
        </button>
      </div>
      <div ref={listRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="border-[3px] border-[var(--navy-dark)] bg-white p-4 text-sm leading-6 text-[var(--ink-soft)] shadow-[4px_4px_0_var(--shadow)]">
            Ask me to add, edit or move cards, or ask anything about the board.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={clsx(
              "max-w-[85%] whitespace-pre-wrap border-[3px] border-[var(--navy-dark)] px-3.5 py-2.5 text-sm leading-6 text-[var(--navy-dark)] shadow-[4px_4px_0_var(--shadow)]",
              message.role === "user" ? "self-end bg-[var(--accent-yellow)]" : "self-start bg-white"
            )}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <p role="status" className="blink self-start font-display text-[9px] text-[var(--ink-soft)]">
            Thinking...
          </p>
        )}
        {error && (
          <p role="alert" className={errorClass}>
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t-4 border-[var(--navy-dark)] bg-white p-5">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message"
          placeholder="Ask the AI to update your board..."
          rows={3}
          className="field resize-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
        >
          <SendHorizontal size={15} />
          Send
        </button>
      </form>
    </aside>
  );
};
