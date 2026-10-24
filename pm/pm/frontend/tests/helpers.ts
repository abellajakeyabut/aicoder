import type { APIRequestContext, Page } from "@playwright/test";
import { initialData } from "../src/lib/kanban";

export const login = async (page: Page, password = "password") => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

// Put the stored board back to the default so tests don't depend on each other
export const resetBoard = async (request: APIRequestContext) => {
  await request.put("/api/board", { data: initialData });
};

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
