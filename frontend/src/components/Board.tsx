import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { BoardAction } from '../board/boardReducer'
import type { BoardState } from '../board/types'
import { CardContent } from './Card'
import { Column } from './Column'

type Props = {
  board: BoardState
  dispatch: (action: BoardAction) => void
}

// The pointer stays put when cards shift between columns, so it avoids the flip-flop that
// rect-based detection causes. Keyboard drags have no pointer and use closestCorners.
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCorners(args)

export function Board({ board, dispatch }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findColumn = (id: UniqueIdentifier) =>
    board.columns.find((column) => column.id === id || column.cardIds.includes(String(id)))

  // Moving between columns happens during the drag so the target column shows the placeholder.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = findColumn(active.id)
    const to = findColumn(over.id)
    if (!from || !to || from === to) return
    const overIndex = to.cardIds.indexOf(String(over.id))
    const translated = active.rect.current.translated
    const below = translated && translated.top > over.rect.top + over.rect.height / 2
    const toIndex = overIndex === -1 ? to.cardIds.length : overIndex + (below ? 1 : 0)
    dispatch({ type: 'moveCard', cardId: String(active.id), toColumnId: to.id, toIndex })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const column = findColumn(over.id)
    const toIndex = column?.cardIds.indexOf(String(over.id)) ?? -1
    if (!column || toIndex === -1) return
    dispatch({ type: 'moveCard', cardId: String(active.id), toColumnId: column.id, toIndex })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full w-max min-w-full items-start gap-4 p-6">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={column.cardIds.map((id) => board.cards[id])}
            dispatch={dispatch}
          />
        ))}
      </div>
      <DragOverlay>
        {/* The tilt sits on an inner element so the measured overlay rect matches the card. */}
        {activeId && (
          <div className="cursor-grabbing">
            <div className="rotate-2 rounded-xl border border-brand/40 bg-white p-3.5 shadow-xl ring-4 ring-brand/10">
              <CardContent card={board.cards[activeId]} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
