import { CardMeta } from "@/components/CardMeta";
import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="cursor-grabbing rotate-2 rounded-2xl border border-[var(--primary-blue)]/40 bg-white px-3.5 py-3 shadow-[0_18px_32px_rgba(3,33,71,0.16)]">
    <h4 className="font-display text-sm font-semibold leading-5 text-[var(--navy-dark)]">
      {card.title}
    </h4>
    <p className="mt-1.5 text-sm leading-5 text-[var(--gray-text)]">
      {card.details || "No details yet."}
    </p>
    <CardMeta card={card} overdue={false} />
  </article>
);
