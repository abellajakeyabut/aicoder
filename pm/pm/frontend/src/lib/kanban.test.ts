import { formatDueDate, isOverdue, moveCard, today, type Column } from "@/lib/kanban";

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

describe("due dates", () => {
  const card = { id: "c", title: "T", details: "", priority: null, dueDate: "2026-11-07" };

  it("isOverdue compares with the given day", () => {
    expect(isOverdue(card, "2026-11-08")).toBe(true);
    expect(isOverdue(card, "2026-11-07")).toBe(false);
    expect(isOverdue({ ...card, dueDate: null }, "2030-01-01")).toBe(false);
  });

  it("formatDueDate shows the month and day", () => {
    expect(formatDueDate("2026-11-07")).toBe("Nov 7");
  });

  it("today is the local date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 2, 23, 30));
    expect(today()).toBe("2026-01-02");
    vi.useRealTimers();
  });
});
