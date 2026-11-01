import { useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Pencil, Trash2 } from "lucide-react";
import { CardMeta } from "@/components/CardMeta";
import type { Card, Priority } from "@/lib/kanban";

const iconButton =
  "flex h-7 w-7 items-center justify-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)]";

type KanbanCardProps = {
  card: Card;
  overdue: boolean;
  locked: boolean;
  onDelete: (cardId: string) => void;
  onEdit: (card: Card) => void;
};

const fieldClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]";

export const KanbanCard = ({ card, overdue, locked, onDelete, onEdit }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState(card.priority ?? "");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: isEditing || locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEditing = () => {
    setTitle(card.title);
    setDetails(card.details);
    setPriority(card.priority ?? "");
    setDueDate(card.dueDate ?? "");
    setIsEditing(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onEdit({
      id: card.id,
      title: title.trim(),
      details: details.trim(),
      priority: (priority || null) as Priority | null,
      dueDate: dueDate || null,
    });
    setIsEditing(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group cursor-grab rounded-2xl border border-[var(--stroke)] bg-white px-3.5 py-3 shadow-[0_6px_16px_rgba(3,33,71,0.06)]",
        "transition-all duration-150 hover:border-[var(--primary-blue)]/40 hover:shadow-[0_10px_24px_rgba(3,33,71,0.10)]",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...(isEditing ? {} : { ...attributes, ...listeners })}
      data-testid={`card-${card.id}`}
    >
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Edit title"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            required
          />
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            aria-label="Edit details"
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              aria-label="Priority"
              className={fieldClass}
            >
              <option value="">No priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Due date"
              className={fieldClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <h4 className="min-w-0 flex-1 font-display text-sm font-semibold leading-5 text-[var(--navy-dark)]">
              {card.title}
            </h4>
            {/* Low emphasis until the card is hovered or a button has focus */}
            <div className="-mr-1 -mt-1 flex shrink-0 gap-0.5 opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={startEditing}
                className={iconButton + " hover:text-[var(--primary-blue)]"}
                aria-label={`Edit ${card.title}`}
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className={iconButton + " hover:text-[var(--secondary-purple)]"}
                aria-label={`Delete ${card.title}`}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-sm leading-5 text-[var(--gray-text)]">
            {card.details || "No details yet."}
          </p>
          <CardMeta card={card} overdue={overdue} />
        </>
      )}
    </article>
  );
};
