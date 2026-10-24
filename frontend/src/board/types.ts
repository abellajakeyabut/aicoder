export type Card = {
  id: string
  title: string
  details: string
}

export type Column = {
  id: string
  title: string
  cardIds: string[]
}

export type BoardState = {
  columns: Column[]
  cards: Record<string, Card>
}
