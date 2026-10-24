import { useState } from 'react'

type Props = {
  onAdd: (title: string, details: string) => void
  onCancel: () => void
}

export function AddCardForm({ onAdd, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onAdd(title.trim(), details.trim())
      }}
      onKeyDown={(event) => event.key === 'Escape' && onCancel()}
      className="space-y-2 rounded-xl border border-brand/30 bg-white p-2.5 shadow-sm"
    >
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Card title"
        aria-label="Card title"
        className="w-full rounded-md px-1.5 py-1 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
      />
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        placeholder="Details (optional)"
        aria-label="Card details"
        rows={3}
        className="w-full resize-none rounded-md bg-slate-50 px-1.5 py-1 text-[13px] text-slate-600 outline-none placeholder:text-slate-400 focus:bg-mint/40"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add card
        </button>
      </div>
    </form>
  )
}
