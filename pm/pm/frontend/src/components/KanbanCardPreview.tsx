import { CardMeta } from "@/components/CardMeta";
import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="cursor-grabbing rotate-2 border-[3px] border-[var(--navy-dark)] bg-[var(--accent-yellow)] px-3 py-2.5 shadow-[8px_8px_0_var(--shadow)]">
    <h4 className="text-sm font-bold leading-5 text-[var(--navy-dark)]">
      {card.title}
    </h4>
    <p className="mt-1 line-clamp-3 text-sm leading-5 text-[var(--ink-soft)]">
      {card.summary || "No summary yet."}
    </p>
    <CardMeta card={card} overdue={false} />
  </article>
);
