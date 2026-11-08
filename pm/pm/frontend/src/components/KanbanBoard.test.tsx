import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import { lastSavedBoard, mockApi, requests, savedBoards } from "@/test/mockApi";

let fetchMock: ReturnType<typeof mockApi>;

const board = (onChange = vi.fn()) => <KanbanBoard boardId={1} name="My first board" onChange={onChange} />;

const renderBoard = async () => {
  render(board());
  return (await screen.findAllByTestId(/column-/i))[0];
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    fetchMock = mockApi();
  });

  it("shows a loading state, then the board from the API", async () => {
    render(board());
    expect(screen.getByText("Loading board...")).toBeInTheDocument();
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(4);
    expect(screen.getByText("Align roadmap themes")).toBeInTheDocument();
    expect(requests(fetchMock)).toEqual(["GET /api/boards/1"]);
    expect(screen.getByRole("heading", { name: "My first board" })).toBeInTheDocument();
  });

  it("shows the card totals in the header and updates them", async () => {
    const column = await renderBoard();
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Cards").nextSibling).toHaveTextContent("8");
    expect(within(header).getByText("High priority").nextSibling).toHaveTextContent("2");
    expect(column).toHaveTextContent("2 cards");
    await userEvent.click(within(column).getByRole("button", { name: "Delete Align roadmap themes" }));
    expect(within(header).getByText("Cards").nextSibling).toHaveTextContent("7");
    expect(within(header).getByText("High priority").nextSibling).toHaveTextContent("1");
    expect(column).toHaveTextContent("1 cards");
  });

  it("renames a column and saves it", async () => {
    const column = await renderBoard();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
    await waitFor(() => expect(lastSavedBoard(fetchMock)?.columns[0].title).toBe("New Name"));
  });

  it("restores the previous title when a column is left blank", async () => {
    const column = await renderBoard();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue("Backlog");
    await waitFor(() => expect(lastSavedBoard(fetchMock)?.columns[0].title).toBe("Backlog"));
  });

  it("shows an error when the board can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    render(board());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the board");
  });

  it("shows an error when a save fails, and clears it after the next save", async () => {
    const saves = [new Response(null, { status: 500 }), Response.json({})];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "PUT" ? saves.shift()! : Response.json(structuredClone(initialData))
      )
    );
    const column = await renderBoard();

    await userEvent.click(within(column).getByRole("button", { name: "Delete Align roadmap themes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");

    await userEvent.click(within(column).getByRole("button", { name: "Delete Gather customer signals" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("adds a card and saves it", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));
    expect(within(column).getByText("New card")).toBeInTheDocument();

    await waitFor(() => expect(savedBoards(fetchMock)).toHaveLength(1));
    const saved = lastSavedBoard(fetchMock)!;
    const newId = saved.columns[0].cardIds[2];
    expect(saved.cards[newId]).toEqual({ id: newId, title: "New card", details: "Notes", priority: null, dueDate: null });
  });

  it("saves empty details as empty and shows a placeholder", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "No notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));
    expect(within(column).getByText("No details yet.")).toBeInTheDocument();

    await waitFor(() => expect(savedBoards(fetchMock)).toHaveLength(1));
    const saved = lastSavedBoard(fetchMock)!;
    expect(saved.cards[saved.columns[0].cardIds[2]].details).toBe("");

    await userEvent.click(within(column).getByRole("button", { name: "Edit No notes" }));
    expect(within(column).getByLabelText("Edit details")).toHaveValue("");
  });

  it("clears details on edit without storing the placeholder", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: "Edit Align roadmap themes" }));
    await userEvent.clear(within(column).getByLabelText("Edit details"));
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));

    expect(within(column).getByText("No details yet.")).toBeInTheDocument();
    await waitFor(() => expect(lastSavedBoard(fetchMock)?.cards["card-1"].details).toBe(""));
  });

  it("removes a card and saves it", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: "Delete Align roadmap themes" }));
    expect(within(column).queryByText("Align roadmap themes")).not.toBeInTheDocument();

    await waitFor(() => expect(savedBoards(fetchMock)).toHaveLength(1));
    const saved = lastSavedBoard(fetchMock)!;
    expect(saved.cards["card-1"]).toBeUndefined();
    expect(saved.columns[0].cardIds).toEqual(["card-2"]);
  });

  it("edits a card and saves it", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: "Edit Align roadmap themes" }));
    const title = within(column).getByLabelText("Edit title");
    await userEvent.clear(title);
    await userEvent.type(title, "Updated title");
    const details = within(column).getByLabelText("Edit details");
    await userEvent.clear(details);
    await userEvent.type(details, "Updated details");
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));

    expect(within(column).getByText("Updated title")).toBeInTheDocument();
    expect(within(column).getByText("Updated details")).toBeInTheDocument();
    await waitFor(() =>
      expect(lastSavedBoard(fetchMock)?.cards["card-1"]).toEqual({
        id: "card-1",
        title: "Updated title",
        details: "Updated details",
        priority: "high",
        dueDate: "2026-11-14",
      })
    );
  });

  it("cancels an edit without saving", async () => {
    const column = await renderBoard();
    await userEvent.click(within(column).getByRole("button", { name: "Edit Align roadmap themes" }));
    await userEvent.type(within(column).getByLabelText("Edit title"), " changed");
    await userEvent.click(within(column).getByRole("button", { name: "Cancel" }));

    expect(within(column).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(savedBoards(fetchMock)).toHaveLength(0);
  });

  it("sets a card's priority and due date, and clears them", async () => {
    const column = await renderBoard();
    const card = within(column).getByTestId("card-card-2");
    expect(within(card).queryByText("priority")).not.toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: "Edit Gather customer signals" }));
    await userEvent.selectOptions(within(card).getByLabelText("Priority"), "medium");
    await userEvent.type(within(card).getByLabelText("Due date"), "2026-12-24");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));

    expect(card).toHaveTextContent("medium priority");
    expect(card).toHaveTextContent("due Dec 24");
    await waitFor(() =>
      expect(lastSavedBoard(fetchMock)?.cards["card-2"]).toMatchObject({ priority: "medium", dueDate: "2026-12-24" })
    );

    await userEvent.click(within(card).getByRole("button", { name: "Edit Gather customer signals" }));
    expect(within(card).getByLabelText("Priority")).toHaveValue("medium");
    expect(within(card).getByLabelText("Due date")).toHaveValue("2026-12-24");
    await userEvent.selectOptions(within(card).getByLabelText("Priority"), "");
    await userEvent.clear(within(card).getByLabelText("Due date"));
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(lastSavedBoard(fetchMock)?.cards["card-2"]).toMatchObject({ priority: null, dueDate: null })
    );
  });

  describe("on 2026-11-10", () => {
    beforeEach(() => {
      // Only Date is faked, so user events still run
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-10T12:00:00"));
    });
    afterEach(() => vi.useRealTimers());

    it("counts and marks overdue cards, except finished ones", async () => {
      const data = structuredClone(initialData);
      data.cards["card-7"].dueDate = "2026-11-01"; // in Done, so not overdue
      fetchMock.mockImplementationOnce(async () => Response.json(data));
      await renderBoard();

      // card-4 (Nov 7, In Progress) and card-6 (Nov 3, In Progress); card-1 is due Nov 14
      expect(within(screen.getByRole("banner")).getByText("Overdue").nextSibling).toHaveTextContent("2");
      expect(screen.getByTestId("card-card-4")).toHaveTextContent("Overdue, due Nov 7");
      expect(screen.getByTestId("card-card-6")).toHaveTextContent("Overdue, due Nov 3");
      expect(screen.getByTestId("card-card-1")).not.toHaveTextContent("Overdue");
      expect(screen.getByTestId("card-card-7")).not.toHaveTextContent("Overdue");
    });
  });

  it("reports every change to onChange", async () => {
    const onChange = vi.fn();
    render(board(onChange));
    const column = (await screen.findAllByTestId(/column-/i))[0];
    await userEvent.click(within(column).getByRole("button", { name: "Delete Align roadmap themes" }));
    expect(Object.keys(onChange.mock.lastCall![0].cards)).toHaveLength(7);
  });
});
