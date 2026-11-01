import { test as base } from "@playwright/test";
import { boardsNav, expect, register, signIn, test, uniqueName } from "./helpers";

base("shows the sign-in form first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(boardsNav(page)).toHaveCount(0);
});

base("rejects a wrong password", async ({ page }) => {
  await page.goto("/");
  await signIn(page, { username: "user", password: "wrong" });
  await expect(page.getByRole("alert").filter({ hasText: "Invalid username or password." })).toBeVisible();
  await expect(boardsNav(page)).toHaveCount(0);
});

base("the demo user can sign in", async ({ page }) => {
  await page.goto("/");
  await signIn(page, { username: "user", password: "password" });
  await expect(boardsNav(page)).toContainText("user");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

base("creates an account with a starter board, stays signed in, logs out and back in", async ({ page }) => {
  const account = { username: uniqueName(), password: "e2e-password" };
  await page.goto("/");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(account.username);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "My first board" })).toBeVisible();
  await expect(boardsNav(page)).toContainText(account.username);
  await page.reload();
  await expect(page.getByRole("heading", { name: "My first board" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await signIn(page, account);
  await expect(boardsNav(page)).toContainText(account.username);
  await page.request.delete("/api/auth/me");
});

base("explains a taken username", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("long-enough");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "That username is taken." })).toBeVisible();
});

test("changes the password", async ({ page, account }) => {
  await page.getByRole("button", { name: "Account settings" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password").fill(account.password);
  await dialog.getByLabel("New password").fill("changed-password");
  await dialog.getByRole("button", { name: "Change password" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Password changed.");
  await dialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Log out" }).click();
  await signIn(page, account);
  await expect(page.getByRole("alert").filter({ hasText: "Invalid username or password." })).toBeVisible();
  await page.getByLabel("Password").fill("changed-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(boardsNav(page)).toContainText(account.username);
});

test("deletes the account", async ({ page, account }) => {
  await page.getByRole("button", { name: "Account settings" }).click();
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await signIn(page, account);
  await expect(page.getByRole("alert").filter({ hasText: "Invalid username or password." })).toBeVisible();
});

base("users only see their own boards", async ({ browser }) => {
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  await register(alice);
  await register(bob);
  const created = await alice.request.post("/api/boards", { data: { name: "Alice only" } });
  const { id } = await created.json();

  await bob.goto("/");
  await expect(bob.getByRole("heading", { name: "My first board" })).toBeVisible();
  await expect(boardsNav(bob)).not.toContainText("Alice only");
  expect((await bob.request.get(`/api/boards/${id}`)).status()).toBe(404);

  await alice.request.delete("/api/auth/me");
  await bob.request.delete("/api/auth/me");
});
