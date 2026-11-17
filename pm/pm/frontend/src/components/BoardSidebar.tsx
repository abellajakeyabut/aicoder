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

const iconButton = "icon-btn";

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
        className={clsx(inputClass, "py-1")}
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
        "sticky top-0 z-10 flex h-screen shrink-0 flex-col border-r-4 border-[var(--navy-dark)] bg-[var(--surface-strong)] transition-[width] duration-200 ease-[steps(4,end)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={clsx("flex items-center gap-3 border-b-4 border-[var(--navy-dark)] py-5", collapsed ? "flex-col px-2" : "px-5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--accent-yellow)] text-[var(--navy-dark)] shadow-[inset_-4px_-4px_0_var(--accent-yellow-dark),0_0_0_3px_var(--navy-dark)]">
          <LayoutGrid size={18} />
        </div>
        {!collapsed && (
          <p className="font-display text-[10px] leading-relaxed text-[var(--navy-dark)]">Kanban Studio</p>
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

      <div className={clsx("flex items-center pb-3 pt-4", collapsed ? "justify-center" : "justify-between px-5")}>
        {!collapsed && (
          <h2 className="bg-[var(--navy-dark)] px-2 py-1 font-display text-[8px] text-[var(--surface)]">Boards</h2>
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
                  "flex h-9 w-9 cursor-pointer items-center justify-center border-[3px] font-display text-[10px] uppercase",
                  board.id === activeId
                    ? "border-[var(--navy-dark)] bg-[var(--accent-yellow)] text-[var(--navy-dark)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--navy-dark)] hover:bg-[var(--surface-2)]"
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
                  "group flex items-center gap-1 border-[3px] pr-1",
                  board.id === activeId
                    ? "border-[var(--navy-dark)] bg-[var(--accent-yellow)] shadow-[3px_3px_0_var(--shadow)]"
                    : "border-transparent hover:bg-[var(--surface-2)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(board.id)}
                  aria-current={board.id === activeId ? "page" : undefined}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left"
                >
                  {/* Menu cursor, like the nav on the reference site */}
                  <span
                    aria-hidden
                    className={clsx(
                      "w-2.5 shrink-0 text-[9px] leading-none text-[var(--navy-dark)]",
                      board.id === activeId ? "blink" : "invisible"
                    )}
                  >
                    &#9654;
                  </span>
                  <span
                    className={clsx(
                      "truncate text-sm",
                      board.id === activeId ? "font-bold text-[var(--navy-dark)]" : "font-medium text-[var(--ink-soft)]"
                    )}
                  >
                    {board.name}
                  </span>
                  <span className="ml-auto font-mono text-xs font-bold text-[var(--navy-dark)]">{board.cardCount}</span>
                </button>
                <div className="flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
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
                    className="icon-btn icon-btn-danger"
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
          "flex items-center gap-2 border-t-4 border-[var(--navy-dark)] bg-[var(--sky-pale)] py-4",
          collapsed ? "flex-col px-2" : "px-4"
        )}
      >
        <div
          title={collapsed ? user.username : undefined}
          className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--coral)] font-display text-[10px] uppercase text-white shadow-[inset_-3px_-3px_0_#00000026,0_0_0_3px_var(--navy-dark)]"
        >
          {user.username[0]}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase text-[var(--gray-text)]">Player 1</p>
            <p className="truncate text-sm font-bold text-[var(--navy-dark)]">{user.username}</p>
          </div>
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
