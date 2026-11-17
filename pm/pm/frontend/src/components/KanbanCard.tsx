import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { AlignLeft, Pencil, Trash2 } from "lucide-react";
import { CardMeta } from "@/components/CardMeta";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  overdue: boolean;
  locked: boolean;
  onDelete: (cardId: string) => void;
  // Opens the card dialog, in edit mode for the Edit button
  onOpen: (cardId: string, editing: boolean) => void;
};

// The board shows a card's summary; clicking it opens the dialog with the full details
export const KanbanCard = ({ card, overdue, locked, onDelete, onOpen }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group cursor-grab border-[3px] border-[var(--navy-dark)] bg-white px-3 py-2.5 shadow-[4px_4px_0_var(--shadow)]",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)]",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
      aria-label={`Open ${card.title}`}
      onClick={() => onOpen(card.id, false)}
      onKeyDown={(event) => {
        // preventDefault, or the same Enter would press the dialog's focused Close button
        if (event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault();
          onOpen(card.id, false);
        }
      }}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start gap-2">
        <h4 className="min-w-0 flex-1 text-sm font-bold leading-5 text-[var(--navy-dark)]">
          {card.title}
        </h4>
        {/* Low emphasis until the card is hovered or a button has focus */}
        <div className="-mr-1 -mt-0.5 flex shrink-0 gap-0.5 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(card.id, true);
            }}
            className="icon-btn"
            aria-label={`Edit ${card.title}`}
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(card.id);
            }}
            className="icon-btn icon-btn-danger"
            aria-label={`Delete ${card.title}`}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <p className="mt-1 line-clamp-3 text-sm leading-5 text-[var(--ink-soft)]">
        {card.summary || "No summary yet."}
      </p>
      <CardMeta card={card} overdue={overdue}>
        {card.details && (
          <span className="chip" title="Has details">
            <AlignLeft size={12} />
            <span className="sr-only">Has details</span>
          </span>
        )}
      </CardMeta>
    </article>
  );
};
