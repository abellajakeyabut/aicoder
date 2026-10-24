import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

const column = (name: string) => screen.getByRole('region', { name })

describe('App', () => {
  it('renders five columns with the dummy cards', () => {
    render(<App />)
    expect(screen.getAllByRole('region')).toHaveLength(5)
    for (const name of ['Backlog', 'To Do', 'In Progress', 'Review', 'Done']) {
      expect(column(name)).toBeInTheDocument()
    }
    expect(within(column('In Progress')).getByText('Billing integration')).toBeInTheDocument()
    expect(within(column('Backlog')).getByText('3')).toBeInTheDocument()
  })

  it('renames a column with Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Backlog' }))
    const input = screen.getByRole('textbox', { name: 'Column name' })
    await user.clear(input)
    await user.type(input, 'Ideas{Enter}')
    expect(column('Ideas')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Backlog' })).not.toBeInTheDocument()
  })

  it('renames a column on blur', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.keyboard('Shipped')
    await user.click(document.body)
    expect(column('Shipped')).toBeInTheDocument()
  })

  it('keeps the old name on Escape or a blank name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Review' }))
    await user.keyboard('Something else{Escape}')
    expect(column('Review')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Review' }))
    await user.clear(screen.getByRole('textbox', { name: 'Column name' }))
    await user.keyboard('{Enter}')
    expect(column('Review')).toBeInTheDocument()
  })

  it('adds a card to a column', async () => {
    const user = userEvent.setup()
    render(<App />)
    const done = column('Done')
    await user.click(within(done).getByRole('button', { name: 'Add card' }))
    const submit = within(done).getByRole('button', { name: 'Add card' })
    expect(submit).toBeDisabled()
    await user.type(within(done).getByRole('textbox', { name: 'Card title' }), 'Launch party')
    await user.type(within(done).getByRole('textbox', { name: 'Card details' }), 'Book the venue')
    await user.click(submit)
    expect(within(done).getByText('Launch party')).toBeInTheDocument()
    expect(within(done).getByText('Book the venue')).toBeInTheDocument()
    expect(within(done).getByText('2')).toBeInTheDocument()
    expect(within(done).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('adds a card by pressing Enter in the title field', async () => {
    const user = userEvent.setup()
    render(<App />)
    const todo = column('To Do')
    await user.click(within(todo).getByRole('button', { name: 'Add card' }))
    await user.keyboard('Write changelog{Enter}')
    expect(within(todo).getByText('Write changelog')).toBeInTheDocument()
  })

  it('cancels adding a card with the Cancel button and Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    const review = column('Review')
    await user.click(within(review).getByRole('button', { name: 'Add card' }))
    await user.keyboard('Discarded')
    await user.click(within(review).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Discarded')).not.toBeInTheDocument()

    await user.click(within(review).getByRole('button', { name: 'Add card' }))
    await user.keyboard('Also discarded{Escape}')
    expect(within(review).queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Also discarded')).not.toBeInTheDocument()
  })

  it('deletes a card', async () => {
    const user = userEvent.setup()
    render(<App />)
    const done = column('Done')
    await user.click(within(done).getByRole('button', { name: 'Delete Brand guidelines' }))
    expect(screen.queryByText('Brand guidelines')).not.toBeInTheDocument()
    expect(within(done).getByText('0')).toBeInTheDocument()
    expect(within(done).getByText('Drop cards here')).toBeInTheDocument()
  })
})
