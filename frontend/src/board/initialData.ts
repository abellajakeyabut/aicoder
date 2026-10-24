import type { BoardState, Card } from './types'

const cardList: Card[] = [
  { id: 'c1', title: 'Competitor pricing review', details: 'Compare tiers and annual discounts across the top five competitors.' },
  { id: 'c2', title: 'Customer interview script', details: 'Draft ten open questions focused on onboarding friction.' },
  { id: 'c3', title: 'Localization scope', details: 'Decide which markets ship at launch and which follow in Q2.' },
  { id: 'c4', title: 'Landing page copy', details: 'Hero headline, three value props and a clear call to action.' },
  { id: 'c5', title: 'Pricing page design', details: 'Three tiers with a monthly and annual toggle.' },
  { id: 'c6', title: 'Onboarding email sequence', details: 'Welcome, setup tips and a day seven check-in.' },
  { id: 'c7', title: 'Billing integration', details: 'Connect the payment provider and handle failed renewals.' },
  { id: 'c8', title: 'Product demo video', details: 'Two minute walkthrough of the core workflow.' },
  { id: 'c9', title: 'Signup flow QA', details: 'Test every path on desktop and mobile browsers.' },
  { id: 'c10', title: 'Analytics events', details: 'Track signup, activation and first project created.' },
  { id: 'c11', title: 'Brand guidelines', details: 'Logo usage, color palette and typography approved.' },
]

export const initialBoard: BoardState = {
  columns: [
    { id: 'backlog', title: 'Backlog', cardIds: ['c1', 'c2', 'c3'] },
    { id: 'todo', title: 'To Do', cardIds: ['c4', 'c5', 'c6'] },
    { id: 'in-progress', title: 'In Progress', cardIds: ['c7', 'c8'] },
    { id: 'review', title: 'Review', cardIds: ['c9', 'c10'] },
    { id: 'done', title: 'Done', cardIds: ['c11'] },
  ],
  cards: Object.fromEntries(cardList.map((card) => [card.id, card])),
}
