import type { BoardState, Card } from './types'

export type BoardAction =
  | { type: 'renameColumn'; columnId: string; title: string }
  | { type: 'addCard'; columnId: string; card: Card }
  | { type: 'deleteCard'; cardId: string }
  | { type: 'moveCard'; cardId: string; toColumnId: string; toIndex: number }

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'renameColumn': {
      const title = action.title.trim()
      if (!title) return state
      return {
        ...state,
        columns: state.columns.map((column) =>
          column.id === action.columnId ? { ...column, title } : column,
        ),
      }
    }
    case 'addCard':
      return {
        cards: { ...state.cards, [action.card.id]: action.card },
        columns: state.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, cardIds: [...column.cardIds, action.card.id] }
            : column,
        ),
      }
    case 'deleteCard': {
      const cards = { ...state.cards }
      delete cards[action.cardId]
      return {
        cards,
        columns: state.columns.map((column) => ({
          ...column,
          cardIds: column.cardIds.filter((id) => id !== action.cardId),
        })),
      }
    }
    case 'moveCard':
      return {
        ...state,
        columns: state.columns.map((column) => {
          const cardIds = column.cardIds.filter((id) => id !== action.cardId)
          if (column.id === action.toColumnId) cardIds.splice(action.toIndex, 0, action.cardId)
          return { ...column, cardIds }
        }),
      }
  }
}
