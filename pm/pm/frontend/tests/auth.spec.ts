import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("shows the login form first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toHaveCount(0);
});

test("rejects a wrong password", async ({ page }) => {
  await login(page, "wrong");
  await expect(page.getByRole("alert").filter({ hasText: "Invalid username or password." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toHaveCount(0);
});

test("logs in, stays logged in on reload, and logs out", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
