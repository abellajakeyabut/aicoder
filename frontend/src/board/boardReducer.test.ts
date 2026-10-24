import { describe, expect, it } from 'vitest'
import { boardReducer } from './boardReducer'
import { initialBoard } from './initialData'
import type { BoardState } from './types'

const board: BoardState = {
  columns: [
    { id: 'a', title: 'A', cardIds: ['1', '2', '3'] },
    { id: 'b', title: 'B', cardIds: ['4'] },
    { id: 'c', title: 'C', cardIds: [] },
  ],
  cards: {
    '1': { id: '1', title: 'One', details: '' },
    '2': { id: '2', title: 'Two', details: '' },
    '3': { id: '3', title: 'Three', details: '' },
    '4': { id: '4', title: 'Four', details: '' },
  },
}

const ids = (state: BoardState) => state.columns.map((column) => column.cardIds)

describe('initialBoard', () => {
  it('has five columns and every card id resolves to a unique card', () => {
    expect(initialBoard.columns).toHaveLength(5)
    const allIds = initialBoard.columns.flatMap((column) => column.cardIds)
    expect(allIds.every((id) => initialBoard.cards[id])).toBe(true)
    expect(new Set(allIds).size).toBe(Object.keys(initialBoard.cards).length)
  })
})

describe('boardReducer', () => {
  it('renames a column and trims whitespace', () => {
    const next = boardReducer(board, { type: 'renameColumn', columnId: 'b', title: '  Doing  ' })
    expect(next.columns[1].title).toBe('Doing')
    expect(next.columns[0].title).toBe('A')
  })

  it('ignores a blank rename', () => {
    expect(boardReducer(board, { type: 'renameColumn', columnId: 'a', title: '   ' })).toBe(board)
  })

  it('adds a card to the end of a column', () => {
    const card = { id: 'new', title: 'New', details: 'Some details' }
    const next = boardReducer(board, { type: 'addCard', columnId: 'c', card })
    expect(next.cards.new).toEqual(card)
    expect(ids(next)).toEqual([['1', '2', '3'], ['4'], ['new']])
  })

  it('deletes a card from its column and the card map', () => {
    const next = boardReducer(board, { type: 'deleteCard', cardId: '2' })
    expect(next.cards['2']).toBeUndefined()
    expect(ids(next)).toEqual([['1', '3'], ['4'], []])
  })

  it('reorders a card within a column', () => {
    const next = boardReducer(board, { type: 'moveCard', cardId: '1', toColumnId: 'a', toIndex: 2 })
    expect(ids(next)).toEqual([['2', '3', '1'], ['4'], []])
  })

  it('moves a card to another column at a given index', () => {
    const next = boardReducer(board, { type: 'moveCard', cardId: '2', toColumnId: 'b', toIndex: 0 })
    expect(ids(next)).toEqual([['1', '3'], ['2', '4'], []])
  })

  it('moves a card to the end of another column', () => {
    const next = boardReducer(board, { type: 'moveCard', cardId: '3', toColumnId: 'b', toIndex: 1 })
    expect(ids(next)).toEqual([['1', '2'], ['4', '3'], []])
  })

  it('moves a card into an empty column', () => {
    const next = boardReducer(board, { type: 'moveCard', cardId: '4', toColumnId: 'c', toIndex: 0 })
    expect(ids(next)).toEqual([['1', '2', '3'], [], ['4']])
  })

  it('does not mutate the previous state', () => {
    const snapshot = structuredClone(board)
    boardReducer(board, { type: 'moveCard', cardId: '1', toColumnId: 'b', toIndex: 0 })
    boardReducer(board, { type: 'deleteCard', cardId: '1' })
    boardReducer(board, { type: 'renameColumn', columnId: 'a', title: 'Z' })
    expect(board).toEqual(snapshot)
  })
})
