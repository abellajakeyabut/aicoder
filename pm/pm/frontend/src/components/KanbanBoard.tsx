"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { CardDialog } from "@/components/CardDialog";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { fetchBoard, saveBoard } from "@/lib/api";
import { createId, isOverdue, moveCard, today, type BoardData, type Card } from "@/lib/kanban";
import { errorClass } from "@/components/ui";

const Stat = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div className="border-l-4 border-[var(--navy-dark)] pl-3">
    <p className="font-mono text-[11px] font-bold uppercase text-[var(--ink-soft)]">{label}</p>
    <p
      className={clsx(
        "mt-1 font-display text-lg leading-none [text-shadow:3px_3px_0_#1d1b2e24]",
        accent && value > 0 ? "text-[var(--coral)]" : "text-[var(--primary-blue)]"
      )}
    >
      {value}
    </p>
  </div>
);

type KanbanBoardProps = {
  boardId: number;
  name: string;
  // Called with every new board, so the board list can show the card count
  onChange: (board: BoardData) => void;
};

export const KanbanBoard = ({ boardId, name, onChange }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  // The card shown in the dialog, and whether it opened in edit mode
  const [openCard, setOpenCard] = useState<{ id: string; editing: boolean } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    fetchBoard(boardId).then(setBoard, () => setLoadFailed(true));
  }, [boardId]);

  if (!board) {
    return loadFailed ? (
      <p role="alert" className={`${errorClass} m-12`}>
        Could not load the board. Check that the server is running, then reload the page.
      </p>
    ) : (
      <p className="blink p-12 font-display text-[10px] text-[var(--ink-soft)]">
        Loading board...
      </p>
    );
  }

  // Each save sends the whole board, so a later successful save also stores any earlier failed change
  const commit = (next: BoardData) => {
    setBoard(next);
    onChange(next);
    saveBoard(boardId, next).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    commit({
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    commit({
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    });
  };

  const handleAddCard = (columnId: string, title: string, summary: string) => {
    const id = createId("card");
    commit({
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, summary, details: "", priority: null, dueDate: null },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    });
  };

  const handleEditCard = (card: Card) => {
    commit({ ...board, cards: { ...board.cards, [card.id]: card } });
  };

  const handleDeleteCard = (cardId: string) => {
    setOpenCard(null);
    commit({
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) => ({
        ...column,
        cardIds: column.cardIds.filter((id) => id !== cardId),
      })),
    });
  };

  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const cards = Object.values(board.cards);
  // Cards in the last column are finished, so they are never overdue
  const finished = new Set(board.columns.at(-1)?.cardIds);
  const now = today();
  const isCardOverdue = (card: Card) => !finished.has(card.id) && isOverdue(card, now);
  const overdue = cards.filter(isCardOverdue).length;
  // The AI may have removed the open card
  const dialogCard = openCard && board.cards[openCard.id];

  return (
    // overflow-clip (not hidden) so the sticky chat sidebar still sticks
    <div className="relative flex overflow-clip">

      <main className="relative flex min-h-screen min-w-0 flex-1 flex-col gap-7 px-6 pb-10 pt-7">
        <header className="px-box mx-1 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-base leading-relaxed text-[var(--navy-dark)] [text-shadow:3px_3px_0_var(--accent-yellow)]">
              {name}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Rename columns, drag cards between stages, open a card for its full details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex gap-6">
              <Stat label="Cards" value={cards.length} />
              <Stat label="High priority" value={cards.filter((card) => card.priority === "high").length} />
              <Stat label="Overdue" value={overdue} accent />
            </div>
            {!chatOpen && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="btn btn-dark whitespace-nowrap"
              >
                <Sparkles size={15} className="text-[var(--accent-yellow)]" />
                Open AI chat
              </button>
            )}
          </div>
          {saveFailed && (
            <p role="alert" className={`${errorClass} w-full`}>
              Your last change could not be saved. Check that the server is running.
            </p>
          )}
        </header>
        {/* The board is locked while the AI works: its reply replaces the whole board, so edits made meanwhile would be lost */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* display: contents, because a fieldset box does not pass its flex height on to the columns */}
          <fieldset disabled={chatLoading} className="contents">
            {/* One row of columns that share the width; narrower than the minimum, the board scrolls sideways.
                The negative margin and padding keep the column shadows inside the scroll area */}
            <section
              className={clsx(
                "-mx-3 -mb-6 -mt-3 grid min-w-0 flex-1 auto-cols-[minmax(210px,1fr)] grid-flow-col gap-5 overflow-x-auto px-3 pb-6 pt-3",
                chatLoading && "opacity-60"
              )}
            >
              {board.columns.map((column, index) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  stage={index + 1}
                  finished={index === board.columns.length - 1}
                  locked={chatLoading}
                  today={now}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onOpenCard={(id, editing) => setOpenCard({ id, editing })}
                />
              ))}
            </section>
          </fieldset>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[210px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {dialogCard && (
        <CardDialog
          key={dialogCard.id}
          card={dialogCard}
          columnTitle={board.columns.find((column) => column.cardIds.includes(dialogCard.id))!.title}
          overdue={isCardOverdue(dialogCard)}
          editing={openCard.editing}
          locked={chatLoading}
          onSave={handleEditCard}
          onDelete={handleDeleteCard}
          onClose={() => setOpenCard(null)}
        />
      )}

      {/* The backend already saved any board from the AI, so set state without saving again */}
      <ChatSidebar
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        loading={chatLoading}
        onLoadingChange={setChatLoading}
        boardId={boardId}
        onBoardUpdate={(next) => {
          setBoard(next);
          onChange(next);
        }}
      />
    </div>
  );
};
