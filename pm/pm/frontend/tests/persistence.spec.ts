import { dragTo, expect, storedBoard, storedBoards, test } from "./helpers";

test("keeps renames, new cards, edits and moves after a reload", async ({ page }) => {
  await page.getByTestId("column-col-backlog").getByLabel("Column title").fill("Persisted column");

  const discovery = page.getByTestId("column-col-discovery");
  await discovery.getByRole("button", { name: /add a card/i }).click();
  await discovery.getByPlaceholder("Card title").fill("Persisted card");
  await discovery.getByRole("button", { name: /add card/i }).click();

  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: "Edit Gather customer signals" }).click();
  await card.getByLabel("Edit title").fill("Persisted edit");
  await card.getByLabel("Priority").selectOption("low");
  await card.getByRole("button", { name: "Save" }).click();

  await dragTo(page, "card-card-3", "column-col-done");

  // Wait until the last change has reached the backend before reloading
  const [{ id }] = await storedBoards(page);
  await expect
    .poll(async () => (await storedBoard(page, id)).columns.find((c) => c.id === "col-done")?.cardIds.includes("card-3"))
    .toBe(true);

  await page.reload();
  await expect(page.getByTestId("column-col-backlog").getByLabel("Column title")).toHaveValue("Persisted column");
  await expect(page.getByTestId("column-col-discovery").getByText("Persisted card")).toBeVisible();
  await expect(page.getByTestId("card-card-2").getByText("Persisted edit")).toBeVisible();
  await expect(page.getByTestId("card-card-2")).toContainText("low priority");
  await expect(page.getByTestId("column-col-done").getByTestId("card-card-3")).toBeVisible();
});
