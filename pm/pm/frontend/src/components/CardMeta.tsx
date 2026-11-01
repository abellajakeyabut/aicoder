import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { formatDueDate, type Card, type Priority } from "@/lib/kanban";

const priorityStyles: Record<Priority, string> = {
  high: "bg-[var(--secondary-purple)]/10 text-[var(--secondary-purple)]",
  medium: "bg-[var(--accent-yellow)]/15 text-[#9a6f00]",
  low: "bg-[var(--primary-blue)]/10 text-[#167aa8]",
};

// Priority and due date badges shown under a card's details
export const CardMeta = ({ card, overdue }: { card: Card; overdue: boolean }) => {
  if (!card.priority && !card.dueDate) {
    return null;
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {card.priority && (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            priorityStyles[card.priority]
          )}
        >
          {card.priority}
          <span className="sr-only"> priority</span>
        </span>
      )}
      {card.dueDate && (
        <span
          className={clsx(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            overdue ? "bg-[var(--secondary-purple)] text-white" : "bg-[var(--surface)] text-[var(--gray-text)]"
          )}
        >
          <CalendarDays size={12} />
          {overdue && <span className="sr-only">Overdue, </span>}
          <span className="sr-only">due </span>
          {formatDueDate(card.dueDate)}
        </span>
      )}
    </div>
  );
};
