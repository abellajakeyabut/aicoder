import { expect, test, type Locator, type Page } from '@playwright/test'

const column = (page: Page, name: string) => page.getByRole('region', { name })
const cardTitles = (col: Locator) => col.locator('article h3')

async function drag(page: Page, source: Locator, target: Locator, offsetY = 0) {
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 5 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + offsetY, { steps: 20 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads the board with five columns and dummy cards', async ({ page }) => {
  await expect(page).toHaveTitle('Kanban')
  await expect(page.getByRole('heading', { name: 'Product Launch' })).toBeVisible()
  await expect(page.getByRole('region')).toHaveCount(5)
  await expect(cardTitles(column(page, 'Backlog'))).toHaveText([
    'Competitor pricing review',
    'Customer interview script',
    'Localization scope',
  ])
  await expect(page.locator('article')).toHaveCount(11)
})

test('renames a column', async ({ page }) => {
  await page.getByRole('button', { name: 'In Progress' }).click()
  await page.getByRole('textbox', { name: 'Column name' }).fill('Building')
  await page.keyboard.press('Enter')
  await expect(column(page, 'Building')).toBeVisible()
  await expect(page.getByRole('region', { name: 'In Progress' })).toHaveCount(0)
})

test('adds and deletes a card', async ({ page }) => {
  const todo = column(page, 'To Do')
  await todo.getByRole('button', { name: 'Add card' }).click()
  await todo.getByRole('textbox', { name: 'Card title' }).fill('Press kit')
  await todo.getByRole('textbox', { name: 'Card details' }).fill('Screenshots and founder bios')
  await todo.getByRole('button', { name: 'Add card' }).click()
  await expect(cardTitles(todo).last()).toHaveText('Press kit')
  await expect(todo.getByText('Screenshots and founder bios')).toBeVisible()

  const card = todo.getByRole('button', { name: 'Press kit', exact: true })
  await card.hover()
  await todo.getByRole('button', { name: 'Delete Press kit' }).click()
  await expect(todo.getByText('Press kit')).toHaveCount(0)
  await expect(cardTitles(todo)).toHaveCount(3)
})

test('drags a card to another column', async ({ page }) => {
  const backlog = column(page, 'Backlog')
  const review = column(page, 'Review')
  await drag(page, backlog.getByText('Competitor pricing review'), review.getByText('Signup flow QA'))
  await expect(cardTitles(review)).toContainText(['Competitor pricing review'])
  await expect(cardTitles(review)).toHaveCount(3)
  await expect(cardTitles(backlog)).toHaveCount(2)
})

test('drags a card into an empty column', async ({ page }) => {
  const done = column(page, 'Done')
  await done.getByRole('button', { name: 'Brand guidelines', exact: true }).hover()
  await done.getByRole('button', { name: 'Delete Brand guidelines' }).click()
  await expect(done.getByText('Drop cards here')).toBeVisible()

  await drag(page, page.getByText('Billing integration'), done.getByText('Drop cards here'))
  await expect(cardTitles(done)).toHaveText(['Billing integration'])
  await expect(cardTitles(column(page, 'In Progress'))).toHaveText(['Product demo video'])
})

test('reorders cards within a column', async ({ page }) => {
  const backlog = column(page, 'Backlog')
  const last = backlog.getByText('Localization scope')
  await drag(page, backlog.getByText('Competitor pricing review'), last, 20)
  await expect(cardTitles(backlog)).toHaveText([
    'Customer interview script',
    'Localization scope',
    'Competitor pricing review',
  ])
})

test('moves a card with the keyboard', async ({ page }) => {
  const todo = column(page, 'To Do')
  await todo.getByRole('button', { name: 'Landing page copy', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status')).toContainText('c4')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('status')).toContainText('over droppable area c5')
  await page.keyboard.press('Space')
  await expect(cardTitles(todo)).toHaveText([
    'Pricing page design',
    'Landing page copy',
    'Onboarding email sequence',
  ])
})

test('moves a card to the next column with the keyboard', async ({ page }) => {
  await column(page, 'To Do').getByRole('button', { name: 'Landing page copy', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status')).toContainText('c4')
  await page.keyboard.press('ArrowRight')
  await expect(cardTitles(column(page, 'In Progress'))).toHaveCount(3)
  await page.keyboard.press('Space')
  await expect(page.getByRole('status')).toContainText('dropped')
  await expect(cardTitles(column(page, 'In Progress'))).toContainText(['Landing page copy'])
  await expect(cardTitles(column(page, 'In Progress'))).toHaveCount(3)
  await expect(cardTitles(column(page, 'To Do'))).toHaveCount(2)
})
