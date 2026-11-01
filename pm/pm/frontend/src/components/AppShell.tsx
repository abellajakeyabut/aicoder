"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AccountDialog } from "@/components/AccountDialog";
import { BoardSidebar } from "@/components/BoardSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { errorClass, glowBackground, primaryButtonClass } from "@/components/ui";
import * as api from "@/lib/api";
import type { BoardSummary, User } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

// The last open board, per user, so a reload returns to it
const storageKey = (user: User) => `pm-board-${user.id}`;

export const AppShell = ({ user, onSignOut }: { user: User; onSignOut: () => void }) => {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBoards().then(
      (list) => {
        const remembered = Number(localStorage.getItem(storageKey(user)));
        setBoards(list);
        setActiveId(list.some((b) => b.id === remembered) ? remembered : (list[0]?.id ?? null));
      },
      () => setError("Could not load your boards. Check that the server is running, then reload the page.")
    );
  }, [user]);

  const select = (id: number | null) => {
    setActiveId(id);
    if (id !== null) {
      localStorage.setItem(storageKey(user), String(id));
    }
  };

  // Run a board request, showing an error if it fails
  const attempt = async (action: () => Promise<void>, failure: string) => {
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    }
  };

  const create = (name: string) =>
    attempt(async () => {
      const board = await api.createBoard(name);
      setBoards((current) => [...current!, board]);
      select(board.id);
    }, "Could not create the board.");

  const rename = (id: number, name: string) =>
    attempt(async () => {
      const renamed = await api.renameBoard(id, name);
      setBoards((current) => current!.map((b) => (b.id === id ? renamed : b)));
    }, "Could not rename the board.");

  const remove = (board: BoardSummary) => {
    if (!window.confirm(`Delete "${board.name}" and all of its cards?`)) {
      return;
    }
    return attempt(async () => {
      await api.deleteBoard(board.id);
      const rest = boards!.filter((b) => b.id !== board.id);
      setBoards(rest);
      if (board.id === activeId) {
        select(rest[0]?.id ?? null);
      }
    }, "Could not delete the board.");
  };

  const signOut = () => attempt(async () => api.logout().then(onSignOut), "Could not log out.");

  const updateCount = (board: BoardData) =>
    setBoards((current) =>
      current!.map((b) => (b.id === activeId ? { ...b, cardCount: Object.keys(board.cards).length } : b))
    );

  const active = boards?.find((b) => b.id === activeId);

  return (
    <div className="relative flex min-h-screen overflow-clip">
      {glowBackground}
      {boards && (
        <BoardSidebar
          user={user}
          boards={boards}
          activeId={activeId}
          onSelect={select}
          onCreate={create}
          onRename={rename}
          onDelete={remove}
          onOpenAccount={() => setAccountOpen(true)}
          onSignOut={signOut}
        />
      )}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {error && (
          <p role="alert" className={`${errorClass} mx-6 mt-4 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3`}>
            {error}
          </p>
        )}
        {active ? (
          // Keyed so switching boards starts fresh (board data, chat history)
          <KanbanBoard key={active.id} boardId={active.id} name={active.name} onChange={updateCount} />
        ) : (
          boards && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
              <h1 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">No boards yet</h1>
              <p className="text-sm text-[var(--gray-text)]">Create a board to start planning.</p>
              <button
                type="button"
                onClick={() => create("My board")}
                className={`${primaryButtonClass} flex items-center gap-2`}
              >
                <Plus size={15} />
                Create a board
              </button>
            </div>
          )
        )}
      </div>
      {accountOpen && (
        <AccountDialog user={user} onClose={() => setAccountOpen(false)} onDeleted={onSignOut} />
      )}
    </div>
  );
};
