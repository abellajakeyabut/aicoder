import { dragTo, expect, storedBoard, storedBoards, test } from "./helpers";

test("loads the kanban board", async ({ page }) => {
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(4);
  await expect(page.getByTestId("card-card-1")).toContainText("high priority");
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Summary").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
  await expect(firstColumn.getByText("Added via e2e.")).toBeVisible();
});

test("shows the summary on the board and the details in a dialog", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await expect(card).toContainText("Draft quarterly themes");
  await expect(card).not.toContainText("Pull the top asks");

  await card.click();
  const dialog = page.getByRole("dialog", { name: "Align roadmap themes" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Turn the strategy offsite notes/)).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Pull the top asks from the offsite board",
    "Pair each theme with one leading metric",
    "Review with product leads before Friday",
  ]);
  // The dialog is wider than a card
  expect((await dialog.boundingBox())!.width).toBeGreaterThan(2 * (await card.boundingBox())!.width);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await card.click();
  await page.mouse.click(10, 10);
  await expect(dialog).toBeHidden();
});

test("edits a card's title, summary, details, priority and due date", async ({ page }) => {
  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: "Edit Gather customer signals" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Edited title");
  await dialog.getByLabel("Summary").fill("Edited summary");
  await dialog.getByLabel("Details").fill("A paragraph about the work.\n\n- First step\n- Second step");
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Due date").fill("2030-02-14");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog.getByRole("heading", { name: "Edited title" })).toBeVisible();
  await expect(dialog.getByText("A paragraph about the work.")).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveText(["First step", "Second step"]);
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(card.getByText("Edited title")).toBeVisible();
  await expect(card.getByText("Edited summary")).toBeVisible();
  await expect(card).not.toContainText("First step");
  await expect(card).toContainText("high priority");
  await expect(card).toContainText("due Feb 14");
  await expect(card).not.toContainText("Overdue");

  // Details are saved, so they are still there after a reload
  const [{ id }] = await storedBoards(page);
  await expect.poll(async () => (await storedBoard(page, id)).cards["card-2"].details).toBe(
    "A paragraph about the work.\n\n- First step\n- Second step"
  );
  await page.reload();
  await page.getByTestId("card-card-2").click();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveText(["First step", "Second step"]);
});

test("marks past due cards as overdue and counts them", async ({ page }) => {
  const overdue = page.getByText("Overdue", { exact: true }).locator("xpath=following-sibling::p");
  const before = Number(await overdue.textContent());

  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: "Edit Gather customer signals" }).click();
  await page.getByRole("dialog").getByLabel("Due date").fill("2020-01-01");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(card).toContainText("Overdue, due Jan 1");
  await expect(overdue).toHaveText(String(before + 1));
});

test("moves a card between columns without opening it", async ({ page }) => {
  await dragTo(page, "card-card-1", "column-col-progress");
  await expect(page.getByTestId("column-col-progress").getByTestId("card-card-1")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("deletes a card", async ({ page }) => {
  await page.getByTestId("card-card-1").getByRole("button", { name: "Delete Align roadmap themes" }).click();
  await expect(page.getByTestId("card-card-1")).toHaveCount(0);
  await expect(page.getByTestId("column-col-backlog")).toContainText("1 cards");
});

test("deletes a card from its dialog", async ({ page }) => {
  await page.getByTestId("card-card-2").click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("card-card-2")).toHaveCount(0);
});
