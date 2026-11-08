import { dragTo, expect, test } from "./helpers";

test("loads the kanban board", async ({ page }) => {
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(4);
  await expect(page.getByTestId("card-card-1")).toContainText("high priority");
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("edits a card's title, details, priority and due date", async ({ page }) => {
  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: "Edit Gather customer signals" }).click();
  await card.getByLabel("Edit title").fill("Edited title");
  await card.getByLabel("Edit details").fill("Edited details");
  await card.getByLabel("Priority").selectOption("high");
  await card.getByLabel("Due date").fill("2030-02-14");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Edited title")).toBeVisible();
  await expect(card.getByText("Edited details")).toBeVisible();
  await expect(card).toContainText("high priority");
  await expect(card).toContainText("due Feb 14");
  await expect(card).not.toContainText("Overdue");
});

test("marks past due cards as overdue and counts them", async ({ page }) => {
  const overdue = page.getByText("Overdue", { exact: true }).locator("xpath=following-sibling::p");
  const before = Number(await overdue.textContent());

  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: "Edit Gather customer signals" }).click();
  await card.getByLabel("Due date").fill("2020-01-01");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card).toContainText("Overdue, due Jan 1");
  await expect(overdue).toHaveText(String(before + 1));
});

test("moves a card between columns", async ({ page }) => {
  await dragTo(page, "card-card-1", "column-col-progress");
  await expect(page.getByTestId("column-col-progress").getByTestId("card-card-1")).toBeVisible();
});

test("deletes a card", async ({ page }) => {
  await page.getByTestId("card-card-1").getByRole("button", { name: "Delete Align roadmap themes" }).click();
  await expect(page.getByTestId("card-card-1")).toHaveCount(0);
  await expect(page.getByTestId("column-col-backlog")).toContainText("1 cards");
});
