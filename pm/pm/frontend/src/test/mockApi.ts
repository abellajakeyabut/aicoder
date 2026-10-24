import { vi } from "vitest";
import type { ChatMessage } from "@/lib/api";
import { initialData, type BoardData } from "@/lib/kanban";

type ChatHandler = (body: { message: string; history: ChatMessage[] }) => Promise<Response>;

// Stubs fetch: GET /api/board returns a fresh copy of initialData, PUT echoes the body,
// and POST /api/chat is answered by `chat` (no real AI calls in tests)
export const mockApi = (chat?: ChatHandler) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/chat") {
      return chat!(JSON.parse(init!.body as string));
    }
    return Response.json(
      init?.method === "PUT" ? JSON.parse(init.body as string) : structuredClone(initialData)
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

export const savedBoards = (fetchMock: ReturnType<typeof mockApi>): BoardData[] =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(init!.body as string));

export const lastSavedBoard = (fetchMock: ReturnType<typeof mockApi>) =>
  savedBoards(fetchMock).at(-1);
