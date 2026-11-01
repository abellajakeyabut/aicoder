import { useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  Check,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { BoardSummary, User } from "@/lib/api";
import { inputClass } from "@/components/ui";

type BoardSidebarProps = {
  user: User;
  boards: BoardSummary[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (board: BoardSummary) => void;
  onOpenAccount: () => void;
  onSignOut: () => void;
};

const iconButton =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--gray-text)] transition hover:bg-white hover:text-[var(--navy-dark)]";

// A one-field form, used to create and to rename boards
const NameForm = ({
  initial,
  label,
  onSubmit,
  onCancel,
}: {
  initial: string;
  label: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        aria-label={label}
        maxLength={60}
        autoFocus
        className={clsx(inputClass, "py-1.5")}
      />
      <button type="submit" aria-label="Save" title="Save" className={iconButton}>
        <Check size={15} />
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel" title="Cancel" className={iconButton}>
        <X size={15} />
      </button>
    </form>
  );
};

export const BoardSidebar = ({
  user,
  boards,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onOpenAccount,
  onSignOut,
}: BoardSidebarProps) => {
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // The name input needs room, so creating a board expands the sidebar
  const startCreate = () => {
    setCollapsed(false);
    setCreating(true);
  };

  return (
    <nav
      aria-label="Boards"
      className={clsx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--stroke)] bg-white/70 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={clsx("flex items-center gap-3 py-5", collapsed ? "flex-col px-2" : "px-5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--navy-dark)] text-[var(--accent-yellow)]">
          <LayoutGrid size={19} />
        </div>
        {!collapsed && (
          <p className="truncate font-display text-lg font-semibold text-[var(--navy-dark)]">Kanban Studio</p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={clsx(iconButton, !collapsed && "ml-auto")}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className={clsx("flex items-center pb-2 pt-3", collapsed ? "justify-center" : "justify-between px-5")}>
        {!collapsed && (
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">Boards</h2>
        )}
        <button type="button" onClick={startCreate} aria-label="New board" title="New board" className={iconButton}>
          <Plus size={16} />
        </button>
      </div>

      <ul className={clsx("flex flex-1 flex-col gap-1 overflow-y-auto", collapsed ? "items-center px-2" : "px-3")}>
        {boards.map((board) => (
          <li key={board.id}>
            {collapsed ? (
              <button
                type="button"
                onClick={() => onSelect(board.id)}
                aria-current={board.id === activeId ? "page" : undefined}
                aria-label={board.name}
                title={board.name}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold uppercase transition",
                  board.id === activeId
                    ? "bg-[var(--surface)] text-[var(--navy-dark)] ring-2 ring-[var(--accent-yellow)]"
                    : "text-[var(--gray-text)] hover:bg-[var(--surface)]/60"
                )}
              >
                {board.name[0]}
              </button>
            ) : renamingId === board.id ? (
              <NameForm
                initial={board.name}
                label="Board name"
                onSubmit={(name) => {
                  onRename(board.id, name);
                  setRenamingId(null);
                }}
                onCancel={() => setRenamingId(null)}
              />
            ) : (
              <div
                className={clsx(
                  "group flex items-center gap-1 rounded-xl pr-1 transition",
                  board.id === activeId ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(board.id)}
                  aria-current={board.id === activeId ? "page" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                >
                  <span
                    className={clsx(
                      "h-2 w-2 shrink-0 rounded-full",
                      board.id === activeId ? "bg-[var(--accent-yellow)]" : "bg-[var(--stroke)]"
                    )}
                  />
                  <span
                    className={clsx(
                      "truncate text-sm",
                      board.id === activeId ? "font-semibold text-[var(--navy-dark)]" : "text-[var(--gray-text)]"
                    )}
                  >
                    {board.name}
                  </span>
                  <span className="ml-auto text-xs text-[var(--gray-text)]">{board.cardCount}</span>
                </button>
                <div className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => setRenamingId(board.id)}
                    aria-label={`Rename ${board.name}`}
                    title="Rename"
                    className={iconButton}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(board)}
                    aria-label={`Delete ${board.name}`}
                    title="Delete"
                    className={clsx(iconButton, "hover:text-[var(--secondary-purple)]")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {creating && (
          <li>
            <NameForm
              initial=""
              label="New board name"
              onSubmit={(name) => {
                onCreate(name);
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
            />
          </li>
        )}
      </ul>

      <div
        className={clsx(
          "flex items-center gap-2 border-t border-[var(--stroke)] py-4",
          collapsed ? "flex-col px-2" : "px-4"
        )}
      >
        <div
          title={collapsed ? user.username : undefined}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-blue)] text-sm font-semibold uppercase text-white"
        >
          {user.username[0]}
        </div>
        {!collapsed && (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--navy-dark)]">{user.username}</p>
        )}
        <button type="button" onClick={onOpenAccount} aria-label="Account settings" title="Account settings" className={iconButton}>
          <Settings size={16} />
        </button>
        <button type="button" onClick={onSignOut} aria-label="Log out" title="Log out" className={iconButton}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
};
