import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { BoardAction } from '../board/boardReducer'
import type { Card, Column as ColumnType } from '../board/types'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './Card'

type Props = {
  column: ColumnType
  cards: Card[]
  dispatch: (action: BoardAction) => void
}

export function Column({ column, cards, dispatch }: Props) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      aria-label={column.title}
      className="flex max-h-full w-64 shrink-0 grow flex-col rounded-2xl border border-brand/10 border-t-[3px] border-t-brand bg-mint/50 shadow-sm"
    >
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-3">
        {editing ? (
          <input
            autoFocus
            defaultValue={column.title}
            aria-label="Column name"
            onFocus={(event) => event.currentTarget.select()}
            onBlur={(event) => {
              dispatch({ type: 'renameColumn', columnId: column.id, title: event.currentTarget.value })
              setEditing(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.value = column.title
              if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
            }}
            className="min-w-0 flex-1 rounded-md border border-brand/40 bg-white px-2 py-0.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename column"
            className="min-w-0 flex-1 truncate rounded-md px-2 py-0.5 text-left text-sm font-semibold tracking-wide text-slate-800 transition hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {column.title}
          </button>
        )}
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand tabular-nums">
          {cards.length}
        </span>
      </header>

      <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-20 flex-col gap-2.5 overflow-y-auto px-3 pt-0.5 pb-1">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onDelete={() => dispatch({ type: 'deleteCard', cardId: card.id })}
            />
          ))}
          {cards.length === 0 && !adding && (
            <p className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-brand/20 text-xs font-medium text-brand/60">
              Drop cards here
            </p>
          )}
        </div>
      </SortableContext>

      <div className="p-3 pt-2">
        {adding ? (
          <AddCardForm
            onAdd={(title, details) => {
              dispatch({ type: 'addCard', columnId: column.id, card: { id: crypto.randomUUID(), title, details } })
              setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add card
          </button>
        )}
      </div>
    </section>
  )
}
