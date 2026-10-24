import { expect, test } from "@playwright/test";
import { dragTo, login, resetBoard } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetBoard(request);
  await login(page);
});

test("loads the kanban board", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("edits a card", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: "Edit Align roadmap themes" }).click();
  await card.getByLabel("Edit title").fill("Edited title");
  await card.getByLabel("Edit details").fill("Edited details");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Edited title")).toBeVisible();
  await expect(card.getByText("Edited details")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await dragTo(page, "card-card-1", "column-col-review");
  await expect(page.getByTestId("column-col-review").getByTestId("card-card-1")).toBeVisible();
});
