import { initialData } from "../src/lib/kanban";
import { expect, test } from "./helpers";

// The chat endpoint is answered in the browser, so these tests never call the backend AI (no OpenRouter costs)
test.beforeEach(async ({ page }) => {
  await page.route("**/api/boards/*/chat", async (route) => {
    const { message } = route.request().postDataJSON();
    const board = structuredClone(initialData);
    board.cards["card-ai"] = { id: "card-ai", title: message, details: "", priority: null, dueDate: null };
    board.columns[0].cardIds.push("card-ai");
    await route.fulfill({ json: { reply: `Added "${message}" to Backlog.`, board } });
  });
});

test("the AI adds a card and the board updates without a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Open AI chat" }).click();
  const chat = page.getByRole("complementary", { name: "AI chat" });
  await chat.getByLabel("Message").fill("Chat card");
  await chat.getByRole("button", { name: "Send" }).click();

  await expect(chat.getByText('Added "Chat card" to Backlog.')).toBeVisible();
  await expect(page.getByTestId("column-col-backlog").getByText("Chat card")).toBeVisible();
});

test("the board fits beside the open sidebar", async ({ page }) => {
  await page.getByRole("button", { name: "Open AI chat" }).click();
  await expect(page.getByRole("complementary", { name: "AI chat" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByRole("button", { name: "Open AI chat" })).toBeVisible();
});

test("the board is locked in the browser while the AI is working", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/boards/*/chat", async (route) => {
    await waiting;
    await route.fulfill({ json: { reply: "Nothing to change.", board: null } });
  });
  await page.getByRole("button", { name: "Open AI chat" }).click();
  const chat = page.getByRole("complementary", { name: "AI chat" });
  await chat.getByLabel("Message").fill("Wait");
  await chat.getByRole("button", { name: "Send" }).click();

  const remove = page.getByTestId("card-card-1").getByRole("button", { name: "Delete Align roadmap themes" });
  await expect(remove).toBeDisabled();
  await expect(page.getByTestId("column-col-backlog").getByLabel("Column title")).toBeDisabled();
  release();
  await expect(chat.getByText("Nothing to change.")).toBeVisible();
  await expect(remove).toBeEnabled();
});
