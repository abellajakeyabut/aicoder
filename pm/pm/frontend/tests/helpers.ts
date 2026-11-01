import { test as base, expect, type Page } from "@playwright/test";
import type { BoardData } from "../src/lib/kanban";

export { expect };

export type Account = { username: string; password: string };

export const uniqueName = () => `e2e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Registers through the API; page.request shares the browser's cookies, so the page is signed in
export const register = async (page: Page, account: Account = { username: uniqueName(), password: "e2e-password" }) => {
  const response = await page.request.post("/api/auth/register", { data: account });
  expect(response.status()).toBe(201);
  return account;
};

// Each test gets its own new user, signed in, with the seeded "My first board" open.
// The account is deleted afterwards (a no-op if the test already signed out or deleted it)
export const test = base.extend<{ account: Account }>({
  account: [
    async ({ page }, use) => {
      const account = await register(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "My first board" })).toBeVisible();
      await use(account);
      await page.request.delete("/api/auth/me");
    },
    { auto: true },
  ],
});

export const signIn = async (page: Page, { username, password }: Account) => {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

export const boardsNav = (page: Page) => page.getByRole("navigation", { name: "Boards" });

export const boardLink = (page: Page, name: string) =>
  boardsNav(page).getByRole("button", { name: new RegExp(`^${name}`) });

export const storedBoards = async (page: Page) =>
  (await page.request.get("/api/boards")).json() as Promise<{ id: number; name: string; cardCount: number }[]>;

export const storedBoard = async (page: Page, id: number): Promise<BoardData> =>
  (await page.request.get(`/api/boards/${id}`)).json();

export const dragTo = async (page: Page, source: string, target: string) => {
  const sourceBox = await page.getByTestId(source).boundingBox();
  const targetBox = await page.getByTestId(target).boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 120, { steps: 12 });
  await page.mouse.up();
};
