import * as api from "@/lib/api";
import { ApiError, fetchBoard, saveBoard, sendChat } from "@/lib/api";
import { initialData } from "@/lib/kanban";
import { mockApi, requests } from "@/test/mockApi";

const boardWithTitle = (title: string) => ({
  ...initialData,
  columns: initialData.columns.map((column, index) => (index === 0 ? { ...column, title } : column)),
});

const sentTitles = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).columns[0].title);

describe("api", () => {
  it("fetchBoard returns the board", async () => {
    mockApi();
    expect(await fetchBoard(1)).toEqual(initialData);
  });

  it("throws an ApiError with the server's detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ detail: "Board not found" }, { status: 404 })));
    const error = await fetchBoard(7).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Board not found");
  });

  it("throws a generic error when the response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    await expect(fetchBoard(1)).rejects.toThrow("Request failed: 500");
  });

  it("getMe returns the user, or null when signed out", async () => {
    mockApi();
    expect(await api.getMe()).toEqual({ id: 1, username: "user" });
    mockApi({ user: null });
    expect(await api.getMe()).toBeNull();
  });

  it("getMe throws when the server fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    await expect(api.getMe()).rejects.toThrow();
  });

  it("calls the auth endpoints", async () => {
    const fetchMock = mockApi({ user: null });
    expect(await api.login("user", "password")).toEqual({ id: 1, username: "user" });
    await api.changePassword("password", "new-password");
    await api.logout();
    expect(await api.register("alice", "wonderland")).toEqual({ id: 2, username: "alice" });
    await api.deleteAccount();
    expect(requests(fetchMock)).toEqual([
      "POST /api/auth/login",
      "PUT /api/auth/password",
      "POST /api/auth/logout",
      "POST /api/auth/register",
      "DELETE /api/auth/me",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ current: "password", new: "new-password" });
  });

  it("calls the board endpoints", async () => {
    const fetchMock = mockApi();
    const created = await api.createBoard("Launch");
    expect(created).toMatchObject({ id: 2, name: "Launch", cardCount: 0 });
    expect(await api.renameBoard(2, "Launch plan")).toMatchObject({ id: 2, name: "Launch plan" });
    expect((await api.listBoards()).map((b) => b.name)).toEqual(["My first board", "Launch plan"]);
    await api.deleteBoard(2);
    expect(requests(fetchMock)).toEqual([
      "POST /api/boards",
      "PATCH /api/boards/2",
      "GET /api/boards",
      "DELETE /api/boards/2",
    ]);
  });

  it("sends saves one at a time, in order", async () => {
    let releaseFirst!: () => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (releaseFirst = () => resolve(Response.json({})))))
      .mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    const first = saveBoard(1, boardWithTitle("first"));
    const second = saveBoard(1, boardWithTitle("second"));
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
      .mockImplementationOnce(() => new Promise((resolve) => (releaseSave = () => resolve(Response.json({})))))
      .mockImplementation(async () => Response.json({ reply: "Hi.", board: null }));
    vi.stubGlobal("fetch", fetchMock);

    saveBoard(3, boardWithTitle("latest"));
    const chat = sendChat(3, "Hello", []);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    releaseSave();
    expect(await chat).toEqual({ reply: "Hi.", board: null });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/boards/3", "/api/boards/3/chat"]);
  });

  it("sends a chat message after a failed save", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValue(Response.json({ reply: "Hi.", board: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveBoard(1, boardWithTitle("bad"))).rejects.toThrow();
    expect(await sendChat(1, "Hello", [])).toEqual({ reply: "Hi.", board: null });
  });

  it("keeps saving after a failed save", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveBoard(1, boardWithTitle("bad"))).rejects.toThrow("Request failed: 422");
    await saveBoard(1, boardWithTitle("good"));
    expect(sentTitles(fetchMock)).toEqual(["bad", "good"]);
  });
});
