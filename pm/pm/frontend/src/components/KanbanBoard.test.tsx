import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { lastSavedBoard, mockApi, savedBoards } from "@/test/mockApi";

let fetchMock: ReturnType<typeof mockApi>;

const renderBoard = async () => {
  render(<KanbanBoard />);
  return (await screen.findAllByTestId(/column-/i))[0];
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    fetchMock = mockApi();
  });

  it("shows a loading state, then the board from the API", async () => {
    render(<KanbanBoard />);
    expect(screen.getByText("Loading board...")).toBeInTheDocument();
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(screen.getByText("Align roadmap themes")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/board");
  });

  it("renames a column and saves it", async () => {
    const column = await renderBoard();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
    await waitFor(() => expect(lastSavedBoard(fetchMock)?.columns[0].title).toBe("New Name"));
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
    expect(saved.cards[newId]).toEqual({ id: newId, title: "New card", details: "Notes" });
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
});
