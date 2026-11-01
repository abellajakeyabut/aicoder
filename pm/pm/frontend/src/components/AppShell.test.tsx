import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/AppShell";
import { DEMO_USER, mockApi, requests } from "@/test/mockApi";

const renderShell = async (onSignOut = vi.fn()) => {
  render(<AppShell user={DEMO_USER} onSignOut={onSignOut} />);
  await screen.findByRole("heading", { name: "My first board" });
  return screen.getByRole("navigation", { name: "Boards" });
};

const createBoard = async (nav: HTMLElement, name: string) => {
  await userEvent.click(within(nav).getByRole("button", { name: "New board" }));
  await userEvent.type(within(nav).getByLabelText("New board name"), `${name}{Enter}`);
};

describe("AppShell", () => {
  let fetchMock: ReturnType<typeof mockApi>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = mockApi();
  });

  it("lists the boards with card counts and opens the first", async () => {
    const nav = await renderShell();
    const item = within(nav).getByRole("button", { name: /^My first board/ });
    expect(item).toHaveAttribute("aria-current", "page");
    expect(item).toHaveTextContent("8");
    expect(await screen.findAllByTestId(/column-/)).toHaveLength(5);
  });

  it("creates a board and switches to it", async () => {
    const nav = await renderShell();
    await createBoard(nav, "Launch plan");
    expect(await screen.findByRole("heading", { name: "Launch plan" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /^Launch plan/ })).toHaveAttribute("aria-current", "page");
    expect(await screen.findAllByText("Drop a card here")).toHaveLength(5);
  });

  it("does not create a board with a blank name, and can cancel", async () => {
    const nav = await renderShell();
    await createBoard(nav, "   ");
    expect(requests(fetchMock)).not.toContain("POST /api/boards");
    await userEvent.click(within(nav).getByRole("button", { name: "Cancel" }));
    expect(within(nav).queryByLabelText("New board name")).not.toBeInTheDocument();
  });

  it("switches boards and remembers the last one", async () => {
    const nav = await renderShell();
    await createBoard(nav, "Second");
    await screen.findByRole("heading", { name: "Second" });
    await userEvent.click(within(nav).getByRole("button", { name: /^My first board/ }));
    expect(await screen.findByRole("heading", { name: "My first board" })).toBeInTheDocument();
    expect(localStorage.getItem("pm-board-1")).toBe("1");

    await userEvent.click(within(nav).getByRole("button", { name: /^Second/ }));
    await screen.findByRole("heading", { name: "Second" });
    expect(localStorage.getItem("pm-board-1")).toBe("2");
  });

  it("opens the remembered board on load", async () => {
    await (await import("@/lib/api")).createBoard("Remembered");
    localStorage.setItem("pm-board-1", "2");
    render(<AppShell user={DEMO_USER} onSignOut={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Remembered" })).toBeInTheDocument();
  });

  it("renames a board", async () => {
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Rename My first board" }));
    const input = within(nav).getByLabelText("Board name");
    await userEvent.clear(input);
    await userEvent.type(input, "Roadmap{Enter}");
    expect(await within(nav).findByRole("button", { name: /^Roadmap/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Roadmap" })).toBeInTheDocument();
  });

  it("cancels a rename with Escape", async () => {
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Rename My first board" }));
    await userEvent.type(within(nav).getByLabelText("Board name"), " changed{Escape}");
    expect(within(nav).getByRole("button", { name: /^My first board/ })).toBeInTheDocument();
    expect(requests(fetchMock).some((r) => r.startsWith("PATCH"))).toBe(false);
  });

  it("deletes a board after confirming and opens the next one", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const nav = await renderShell();
    await createBoard(nav, "Second");
    await userEvent.click(within(nav).getByRole("button", { name: /^My first board/ }));
    await screen.findByRole("heading", { name: "My first board" });

    await userEvent.click(within(nav).getByRole("button", { name: "Delete My first board" }));
    expect(confirm).toHaveBeenCalledWith('Delete "My first board" and all of its cards?');
    expect(await screen.findByRole("heading", { name: "Second" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: /My first board/ })).not.toBeInTheDocument();
  });

  it("keeps the board when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Delete My first board" }));
    expect(within(nav).getByRole("button", { name: /^My first board/ })).toBeInTheDocument();
    expect(requests(fetchMock).some((r) => r.startsWith("DELETE"))).toBe(false);
  });

  it("shows an empty state after the last board is deleted, and creates a new one", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Delete My first board" }));
    expect(await screen.findByRole("heading", { name: "No boards yet" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create a board" }));
    expect(await screen.findByRole("heading", { name: "My board" })).toBeInTheDocument();
  });

  it("updates the card count when cards change", async () => {
    const nav = await renderShell();
    const column = (await screen.findAllByTestId(/column-/))[0];
    await userEvent.click(within(column).getByRole("button", { name: "Delete Align roadmap themes" }));
    expect(within(nav).getByRole("button", { name: /^My first board/ })).toHaveTextContent("7");
  });

  it("shows an error when a board request fails", async () => {
    const nav = await renderShell();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await createBoard(nav, "Broken");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not create the board.");
  });

  it("shows an error when the boards can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    render(<AppShell user={DEMO_USER} onSignOut={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your boards");
  });

  it("logs out", async () => {
    const onSignOut = vi.fn();
    const nav = await renderShell(onSignOut);
    await userEvent.click(within(nav).getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
    expect(requests(fetchMock)).toContain("POST /api/auth/logout");
  });

  it("collapses the sidebar to a rail and expands it again", async () => {
    const nav = await renderShell();
    await createBoard(nav, "Second");
    await screen.findByRole("heading", { name: "Second" });

    await userEvent.click(within(nav).getByRole("button", { name: "Collapse sidebar" }));
    expect(within(nav).queryByRole("button", { name: "Rename My first board" })).not.toBeInTheDocument();
    await userEvent.click(within(nav).getByRole("button", { name: "My first board" }));
    expect(await screen.findByRole("heading", { name: "My first board" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "My first board" })).toHaveAttribute("aria-current", "page");

    await userEvent.click(within(nav).getByRole("button", { name: "Expand sidebar" }));
    expect(within(nav).getByRole("button", { name: "Rename My first board" })).toBeInTheDocument();
  });

  it("expands the collapsed sidebar to create a board", async () => {
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Collapse sidebar" }));
    await userEvent.click(within(nav).getByRole("button", { name: "New board" }));
    expect(within(nav).getByLabelText("New board name")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("opens and closes the account dialog", async () => {
    const nav = await renderShell();
    await userEvent.click(within(nav).getByRole("button", { name: "Account settings" }));
    expect(screen.getByRole("dialog", { name: "user" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
