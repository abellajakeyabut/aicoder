import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../board/types'

export function CardContent({ card }: { card: Card }) {
  return (
    <>
      <h3 className="pr-6 text-sm leading-snug font-semibold text-slate-800">{card.title}</h3>
      {card.details && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{card.details}</p>
      )}
    </>
  )
}

type Props = {
  card: Card
  onDelete: () => void
}

export function SortableCard({ card, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={card.title}
      className={`group relative cursor-grab rounded-xl border p-3.5 shadow-sm transition-[border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isDragging
          ? 'border-dashed border-brand/50 bg-mint/70 opacity-60'
          : 'border-slate-200/80 bg-white hover:border-brand/40 hover:shadow-md'
      }`}
    >
      <CardContent card={card} />
      <button
        type="button"
        onClick={onDelete}
        // Keep Space/Enter on the button from starting a keyboard drag on the card.
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={`Delete ${card.title}`}
        className="absolute top-2.5 right-2.5 rounded-md p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </article>
  )
}
