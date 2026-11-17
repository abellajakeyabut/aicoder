import { useRef } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { isOverdue, type Card, type Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

const stageColors = ["bg-[var(--sky)]", "bg-[var(--accent-yellow)]", "bg-[var(--secondary-purple)]", "bg-[var(--coral)]"];

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  // 1-based position, shown as "Stage 01"
  stage: number;
  finished: boolean;
  // While the AI works, cards can't be dragged
  locked: boolean;
  today: string;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, summary: string) => void;
  onDeleteCard: (cardId: string) => void;
  onOpenCard: (cardId: string, editing: boolean) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  stage,
  finished,
  locked,
  today,
  onRename,
  onAddCard,
  onDeleteCard,
  onOpenCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const titleOnFocus = useRef(column.title);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "px-box flex min-h-[480px] min-w-0 flex-col",
        isOver && "!bg-[var(--surface-2)]"
      )}
      data-testid={`column-${column.id}`}
    >
      {/* Colored cap like a level card; the finished column is green */}
      <div
        className={clsx(
          "border-b-4 border-[var(--navy-dark)] px-3 pb-3 pt-2.5",
          finished ? "bg-[var(--mint)]" : stageColors[(stage - 1) % stageColors.length]
        )}
      >
        <p className="inline-block bg-[var(--navy-dark)] px-1.5 py-1 font-display text-[7px] text-[var(--surface)]">
          Stage {String(stage).padStart(2, "0")}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            onFocus={() => (titleOnFocus.current = column.title)}
            // A column can't be left without a name: restore the title it had before editing
            onBlur={() => !column.title.trim() && onRename(column.id, titleOnFocus.current)}
            className="min-w-0 flex-1 border-2 border-transparent bg-transparent px-1 py-1 font-display text-[10px] text-[var(--navy-dark)] outline-none hover:border-dashed hover:border-[var(--navy-dark)] focus:border-solid focus:border-[var(--navy-dark)] focus:bg-white"
            aria-label="Column title"
          />
          <span className="chip bg-white">
            {cards.length}
            <span className="sr-only"> cards</span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              overdue={!finished && isOverdue(card, today)}
              locked={locked}
              onDelete={onDeleteCard}
              onOpen={onOpenCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex items-center justify-center border-[3px] border-dashed border-[var(--gray-text)] bg-[repeating-linear-gradient(-45deg,#f1eef8_0_10px,#e6e1f2_10px_20px)] px-3 py-6 text-center font-display text-[8px] leading-relaxed text-[var(--ink-soft)]">
            Drop a card here
          </div>
        )}
        <NewCardForm
          onAdd={(title, summary) => onAddCard(column.id, title, summary)}
        />
      </div>
    </section>
  );
};
