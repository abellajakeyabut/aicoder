import { moveCard, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const columns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2", "card-3"] },
    { id: "col-b", title: "B", cardIds: ["card-4"] },
    { id: "col-c", title: "C", cardIds: [] },
  ];

  it.each([
    ["moves a card up in its column", "card-3", "card-1", [["card-3", "card-1", "card-2"], ["card-4"], []]],
    ["moves a card down in its column", "card-1", "card-3", [["card-2", "card-3", "card-1"], ["card-4"], []]],
    ["moves a card to the end of its own column", "card-1", "col-a", [["card-2", "card-3", "card-1"], ["card-4"], []]],
    ["moves a card onto a card in another column", "card-2", "card-4", [["card-1", "card-3"], ["card-2", "card-4"], []]],
    ["moves a card to the end of another column", "card-1", "col-b", [["card-2", "card-3"], ["card-4", "card-1"], []]],
    ["moves a card into an empty column", "card-4", "col-c", [["card-1", "card-2", "card-3"], [], ["card-4"]]],
  ])("%s", (_, activeId, overId, expected) => {
    expect(moveCard(columns, activeId, overId).map((column) => column.cardIds)).toEqual(expected);
  });

  it.each([
    ["an unknown card", "card-x", "col-b"],
    ["an unknown target", "card-1", "col-x"],
  ])("leaves the columns unchanged for %s", (_, activeId, overId) => {
    expect(moveCard(columns, activeId, overId)).toBe(columns);
  });

  it("keeps column ids and titles", () => {
    const result = moveCard(columns, "card-1", "col-b");
    expect(result.map(({ id, title }) => ({ id, title }))).toEqual(
      columns.map(({ id, title }) => ({ id, title }))
    );
  });
});
