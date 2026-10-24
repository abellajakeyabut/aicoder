import { fetchBoard, saveBoard, sendChat } from "@/lib/api";
import { initialData } from "@/lib/kanban";

const boardWithTitle = (title: string) => ({
  ...initialData,
  columns: initialData.columns.map((column, index) =>
    index === 0 ? { ...column, title } : column
  ),
});

const sentTitles = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).columns[0].title);

describe("api", () => {
  it("fetchBoard returns the board", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(initialData)));
    expect(await fetchBoard()).toEqual(initialData);
  });

  it("fetchBoard throws on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    await expect(fetchBoard()).rejects.toThrow("Failed to load board: 500");
  });

  it("sends saves one at a time, in order", async () => {
    let releaseFirst!: () => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => (releaseFirst = () => resolve(new Response(null))))
      )
      .mockImplementation(async () => new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    const first = saveBoard(boardWithTitle("first"));
    const second = saveBoard(boardWithTitle("second"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    releaseFirst();
    await first;
    await second;
    expect(sentTitles(fetchMock)).toEqual(["first", "second"]);
  });

  it("sends a chat message only after pending saves finish", async () => {
    let releaseSave!: () => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => (releaseSave = () => resolve(new Response(null))))
      )
      .mockImplementation(async () => Response.json({ reply: "Hi.", board: null }));
    vi.stubGlobal("fetch", fetchMock);

    saveBoard(boardWithTitle("latest"));
    const chat = sendChat("Hello", []);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    releaseSave();
    expect(await chat).toEqual({ reply: "Hi.", board: null });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/board", "/api/chat"]);
  });

  it("sends a chat message after a failed save", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValue(Response.json({ reply: "Hi.", board: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveBoard(boardWithTitle("bad"))).rejects.toThrow();
    expect(await sendChat("Hello", [])).toEqual({ reply: "Hi.", board: null });
  });

  it("keeps saving after a failed save", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveBoard(boardWithTitle("bad"))).rejects.toThrow("Failed to save board: 422");
    await saveBoard(boardWithTitle("good"));
    expect(sentTitles(fetchMock)).toEqual(["bad", "good"]);
  });
});
