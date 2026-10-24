import { expect, test } from "@playwright/test";
import { initialData } from "../src/lib/kanban";
import { login, resetBoard } from "./helpers";

// /api/chat is answered in the browser, so these tests never call the backend AI (no OpenRouter costs)
test.beforeEach(async ({ page, request }) => {
  await resetBoard(request);
  await page.route("**/api/chat", async (route) => {
    const { message } = route.request().postDataJSON();
    const board = structuredClone(initialData);
    board.cards["card-ai"] = { id: "card-ai", title: message, details: "" };
    board.columns[0].cardIds.push("card-ai");
    await route.fulfill({ json: { reply: `Added "${message}" to Backlog.`, board } });
  });
  await login(page);
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
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByRole("button", { name: "Open AI chat" })).toBeVisible();
});
