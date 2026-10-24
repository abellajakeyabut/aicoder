import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import { mockApi, savedBoards } from "@/test/mockApi";

const openChat = async () => {
  render(<KanbanBoard />);
  await screen.findAllByTestId(/column-/i);
  await userEvent.click(screen.getByRole("button", { name: "Open AI chat" }));
  return screen.getByRole("complementary", { name: "AI chat" });
};

const ask = async (chat: HTMLElement, message: string) => {
  await userEvent.type(within(chat).getByLabelText("Message"), message);
  await userEvent.click(within(chat).getByRole("button", { name: "Send" }));
};

describe("ChatSidebar", () => {
  it("shows the user message, a loading state, then the reply, and sends the history", async () => {
    let answer!: (response: Response) => void;
    const fetchMock = mockApi(() => new Promise((resolve) => (answer = resolve)));
    const chat = await openChat();

    await ask(chat, "How many columns?");
    expect(within(chat).getByText("How many columns?")).toBeInTheDocument();
    expect(within(chat).getByRole("status")).toHaveTextContent("Thinking...");
    expect(within(chat).getByRole("button", { name: "Send" })).toBeDisabled();

    answer(Response.json({ reply: "There are 5 columns.", board: null }));
    expect(await within(chat).findByText("There are 5 columns.")).toBeInTheDocument();
    expect(within(chat).queryByRole("status")).not.toBeInTheDocument();

    await ask(chat, "Thanks");
    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(init!.body as string)).toEqual({
      message: "Thanks",
      history: [
        { role: "user", content: "How many columns?" },
        { role: "assistant", content: "There are 5 columns." },
      ],
    });
  });

  it("locks the board while the AI is working", async () => {
    let answer!: (response: Response) => void;
    mockApi(() => new Promise((resolve) => (answer = resolve)));
    const chat = await openChat();
    const column = screen.getByTestId("column-col-backlog");
    const controls = () => [
      within(column).getByLabelText("Column title"),
      within(column).getByRole("button", { name: "Edit Align roadmap themes" }),
      within(column).getByRole("button", { name: "Delete Align roadmap themes" }),
      within(column).getByRole("button", { name: /add a card/i }),
    ];

    await ask(chat, "Add a card");
    controls().forEach((control) => expect(control).toBeDisabled());

    answer(Response.json({ reply: "Nothing to change.", board: null }));
    await within(chat).findByText("Nothing to change.");
    controls().forEach((control) => expect(control).toBeEnabled());
  });

  it("shows a board from the AI without saving it again", async () => {
    const board = structuredClone(initialData);
    board.cards["card-ai"] = { id: "card-ai", title: "Added by AI", details: "" };
    board.columns[0].cardIds.push("card-ai");
    const fetchMock = mockApi(async () => Response.json({ reply: "Added.", board }));
    const chat = await openChat();

    await ask(chat, "Add a card");
    expect(await within(screen.getByTestId("column-col-backlog")).findByText("Added by AI")).toBeInTheDocument();
    expect(savedBoards(fetchMock)).toHaveLength(0);
  });

  it("shows an error when the request fails and lets the user retry", async () => {
    const replies = [new Response(null, { status: 502 }), Response.json({ reply: "Added.", board: null })];
    const fetchMock = mockApi(async () => replies.shift()!);
    const chat = await openChat();

    await ask(chat, "Add a card");
    expect(await within(chat).findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(within(chat).getByLabelText("Message")).toHaveValue("Add a card");

    await userEvent.click(within(chat).getByRole("button", { name: "Send" }));
    expect(await within(chat).findByText("Added.")).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(init!.body as string)).toEqual({ message: "Add a card", history: [] });
  });

  it("keeps the conversation when closed and reopened", async () => {
    mockApi(async () => Response.json({ reply: "Hello!", board: null }));
    const chat = await openChat();
    await ask(chat, "Hi");
    await within(chat).findByText("Hello!");

    await userEvent.click(within(chat).getByRole("button", { name: "Close chat" }));
    expect(screen.queryByRole("complementary", { name: "AI chat" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open AI chat" }));
    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  it("sends on Enter", async () => {
    mockApi(async () => Response.json({ reply: "Sent.", board: null }));
    const chat = await openChat();
    await userEvent.type(within(chat).getByLabelText("Message"), "Hi{Enter}");
    expect(await within(chat).findByText("Sent.")).toBeInTheDocument();
  });
});
