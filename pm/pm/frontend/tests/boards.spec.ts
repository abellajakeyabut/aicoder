import { boardLink, boardsNav, expect, storedBoards, test } from "./helpers";

test("creates, switches, renames and deletes boards, and keeps them after a reload", async ({ page }) => {
  const nav = boardsNav(page);
  await nav.getByRole("button", { name: "New board" }).click();
  await nav.getByLabel("New board name").fill("Launch plan");
  await nav.getByLabel("New board name").press("Enter");

  await expect(page.getByRole("heading", { name: "Launch plan" })).toBeVisible();
  await expect(page.getByText("Drop a card here")).toHaveCount(5);

  const backlog = page.locator('[data-testid^="column-"]').first();
  await backlog.getByRole("button", { name: /add a card/i }).click();
  await backlog.getByPlaceholder("Card title").fill("Book the venue");
  await backlog.getByRole("button", { name: /add card/i }).click();
  await expect(boardLink(page, "Launch plan")).toContainText("1");

  await boardLink(page, "My first board").click();
  await expect(page.getByRole("heading", { name: "My first board" })).toBeVisible();
  await expect(page.getByText("Book the venue")).toHaveCount(0);

  await nav.getByRole("button", { name: "Rename Launch plan" }).click();
  await nav.getByLabel("Board name").fill("Product launch");
  await nav.getByRole("button", { name: "Save" }).click();
  await expect(boardLink(page, "Product launch")).toBeVisible();

  // The last open board is remembered across reloads
  await boardLink(page, "Product launch").click();
  await expect(page.getByRole("heading", { name: "Product launch" })).toBeVisible();
  await expect.poll(async () => (await storedBoards(page)).find((b) => b.name === "Product launch")?.cardCount).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Product launch" })).toBeVisible();
  await expect(page.getByText("Book the venue")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await nav.getByRole("button", { name: "Delete Product launch" }).click();
  await expect(page.getByRole("heading", { name: "My first board" })).toBeVisible();
  await expect(boardLink(page, "Product launch")).toHaveCount(0);
  expect((await storedBoards(page)).map((b) => b.name)).toEqual(["My first board"]);
});

test("dismissing the delete prompt keeps the board", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.dismiss());
  await boardsNav(page).getByRole("button", { name: "Delete My first board" }).click();
  await expect(boardLink(page, "My first board")).toBeVisible();
  expect(await storedBoards(page)).toHaveLength(1);
});

test("deleting the only board shows an empty state", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept());
  await boardsNav(page).getByRole("button", { name: "Delete My first board" }).click();
  await expect(page.getByRole("heading", { name: "No boards yet" })).toBeVisible();
  await page.getByRole("button", { name: "Create a board" }).click();
  await expect(page.getByRole("heading", { name: "My board" })).toBeVisible();
});
