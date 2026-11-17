import type { ReactNode } from "react";
import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { formatDueDate, type Card, type Priority } from "@/lib/kanban";

const priorityStyles: Record<Priority, string> = {
  high: "!bg-[var(--coral)] !text-white",
  medium: "!bg-[var(--accent-yellow)]",
  low: "!bg-[var(--sky)]",
};

// Priority and due date badges shown under a card's summary, followed by any extra badges
export const CardMeta = ({ card, overdue, children }: { card: Card; overdue: boolean; children?: ReactNode }) => {
  if (!card.priority && !card.dueDate && !children) {
    return null;
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {card.priority && (
        <span
          className={clsx(
            "chip",
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
            "chip",
            overdue && "!bg-[var(--navy-dark)] !text-[var(--accent-yellow)]"
          )}
        >
          <CalendarDays size={12} />
          {overdue && <span className="sr-only">Overdue, </span>}
          <span className="sr-only">due </span>
          {formatDueDate(card.dueDate)}
        </span>
      )}
      {children}
    </div>
  );
};
