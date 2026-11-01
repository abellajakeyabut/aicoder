import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

const columnBoxes = async (page: Page) => {
  const columns = page.locator('[data-testid^="column-"]');
  await expect(columns).toHaveCount(5);
  return Promise.all((await columns.all()).map(async (column) => (await column.boundingBox())!));
};

test.use({ viewport: { width: 1440, height: 900 } });

// The boards sidebar on the left is 256px wide
const SIDEBAR = 256;

test("the columns sit in one row across the rest of the width and fill the height", async ({ page }) => {
  const boxes = await columnBoxes(page);
  boxes.forEach((box) => expect(box.y).toBe(boxes[0].y));
  const last = boxes.at(-1)!;
  // Only the page padding is left beside the board
  expect(boxes[0].x - SIDEBAR).toBeLessThanOrEqual(32);
  // The last column ends inside the window, not cut off
  expect(1440 - (last.x + last.width)).toBeGreaterThanOrEqual(0);
  expect(1440 - (last.x + last.width)).toBeLessThanOrEqual(32);
  expect(boxes[0].y + boxes[0].height).toBeGreaterThan(900 - 48);
});

test("with the chat open the columns stay in one row and the board scrolls sideways", async ({ page }) => {
  await page.getByRole("button", { name: "Open AI chat" }).click();
  await expect(page.getByRole("complementary", { name: "AI chat" })).toBeVisible();
  const boxes = await columnBoxes(page);
  boxes.forEach((box) => expect(box.y).toBe(boxes[0].y));

  const done = page.getByTestId("column-col-done");
  await done.getByRole("button", { name: /add a card/i }).scrollIntoViewIfNeeded();
  await expect(done.getByRole("button", { name: /add a card/i })).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("collapsing the sidebar leaves a 64px rail and widens the columns", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Boards" });
  const before = await columnBoxes(page);
  await nav.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect.poll(async () => (await nav.boundingBox())!.width).toBe(64);
  const after = await columnBoxes(page);
  expect(after[0].width).toBeGreaterThan(before[0].width);
  expect(after[0].x - 64).toBeLessThanOrEqual(32);

  await nav.getByRole("button", { name: "Expand sidebar" }).click();
  await expect.poll(async () => (await nav.boundingBox())!.width).toBe(SIDEBAR);
});

test("cards use icon buttons to edit and delete", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  const remove = card.getByRole("button", { name: "Delete Align roadmap themes" });
  await expect(card.getByRole("button", { name: "Edit Align roadmap themes" }).locator("svg")).toBeVisible();
  await expect(remove.locator("svg")).toBeVisible();
  await expect(remove).toHaveText("");

  await remove.click();
  await expect(page.getByTestId("card-card-1")).toHaveCount(0);
  await expect(page.getByTestId("column-col-backlog")).toContainText("1 cards");
});

test("sidebar and header buttons are icons with labels", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Log out" })).toHaveText("");
  await page.getByRole("button", { name: "Open AI chat" }).click();
  await expect(page.getByRole("button", { name: "Open AI chat" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close chat" })).toHaveText("");
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByRole("button", { name: "Open AI chat" })).toBeVisible();
});
