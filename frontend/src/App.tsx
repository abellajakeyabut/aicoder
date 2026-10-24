import { useReducer } from 'react'
import { boardReducer } from './board/boardReducer'
import { initialBoard } from './board/initialData'
import { Board } from './components/Board'

export default function App() {
  const [board, dispatch] = useReducer(boardReducer, initialBoard)

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 bg-brand px-6 py-4 text-mint shadow-md">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.15" />
          <rect x="7" y="8" width="4.5" height="16" rx="1.5" fill="currentColor" />
          <rect x="13.75" y="8" width="4.5" height="11" rx="1.5" fill="currentColor" />
          <rect x="20.5" y="8" width="4.5" height="7" rx="1.5" fill="currentColor" />
        </svg>
        <div>
          <p className="text-xs font-medium tracking-widest text-mint/70 uppercase">Kanban</p>
          <h1 className="text-lg leading-tight font-semibold">Product Launch</h1>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-x-auto">
        <Board board={board} dispatch={dispatch} />
      </main>
    </div>
  )
}
