import { vi } from "vitest";
import type { BoardSummary, ChatMessage, User } from "@/lib/api";
import { initialData, type BoardData } from "@/lib/kanban";

type ChatHandler = (body: { message: string; history: ChatMessage[] }) => Promise<Response>;

type MockOptions = {
  // The signed-in user, or null when signed out
  user?: User | null;
  chat?: ChatHandler;
};

export const DEMO_USER: User = { id: 1, username: "user" };

const error = (status: number, detail = "Error") => Response.json({ detail }, { status });

// A small in-memory stand-in for the backend. The demo user signs in with user / password and
// starts with board 1 ("My first board", initialData). Chat requests are answered by `chat`
export const mockApi = (chatOrOptions?: ChatHandler | MockOptions) => {
  const options = typeof chatOrOptions === "function" ? { chat: chatOrOptions } : (chatOrOptions ?? {});
  let user = options.user === undefined ? DEMO_USER : options.user;
  let nextId = 2;
  const boards = new Map<number, { name: string; data: BoardData; updatedAt: string }>([
    [1, { name: "My first board", data: structuredClone(initialData), updatedAt: "2026-10-01T00:00:00Z" }],
  ]);
  const summary = (id: number): BoardSummary => {
    const { name, data, updatedAt } = boards.get(id)!;
    return { id, name, cardCount: Object.keys(data.cards).length, updatedAt };
  };

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const route = `${method} ${url.replace(/\/\d+/, "/:id")}`;
    const id = Number(url.match(/\/(\d+)/)?.[1]);

    switch (route) {
      case "POST /api/auth/login":
        if (body.username !== "user" || body.password !== "password") {
          return error(401);
        }
        user = DEMO_USER;
        return Response.json(user);
      case "POST /api/auth/register":
        if (body.username === "user") {
          return error(409);
        }
        if (body.password.length < 8) {
          return error(422);
        }
        user = { id: 2, username: body.username };
        return Response.json(user, { status: 201 });
    }
    if (!user) {
      return error(401);
    }
    switch (route) {
      case "GET /api/auth/me":
        return Response.json(user);
      case "POST /api/auth/logout":
      case "DELETE /api/auth/me":
        user = null;
        return new Response(null, { status: 204 });
      case "PUT /api/auth/password":
        return body.current === "password" ? new Response(null, { status: 204 }) : error(403);
      case "GET /api/boards":
        return Response.json([...boards.keys()].map(summary));
      case "POST /api/boards": {
        const empty = { ...initialData, columns: initialData.columns.map((c) => ({ ...c, cardIds: [] })), cards: {} };
        boards.set(nextId, { name: body.name, data: empty, updatedAt: new Date().toISOString() });
        return Response.json(summary(nextId++), { status: 201 });
      }
    }
    if (!boards.has(id)) {
      return error(404);
    }
    switch (route) {
      case "GET /api/boards/:id":
        return Response.json(structuredClone(boards.get(id)!.data));
      case "PUT /api/boards/:id":
        boards.get(id)!.data = body;
        return Response.json(body);
      case "PATCH /api/boards/:id":
        boards.get(id)!.name = body.name;
        return Response.json(summary(id));
      case "DELETE /api/boards/:id":
        boards.delete(id);
        return new Response(null, { status: 204 });
      case "POST /api/boards/:id/chat":
        return options.chat!(body);
    }
    throw new Error(`Unexpected request: ${route}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

export const savedBoards = (fetchMock: ReturnType<typeof mockApi>): BoardData[] =>
  fetchMock.mock.calls
    .filter(([url, init]) => init?.method === "PUT" && /^\/api\/boards\/\d+$/.test(url))
    .map(([, init]) => JSON.parse(init!.body as string));

export const lastSavedBoard = (fetchMock: ReturnType<typeof mockApi>) => savedBoards(fetchMock).at(-1);

export const requests = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`);
