import type { BoardData } from "@/lib/kanban";

export type User = { id: number; username: string };

export type BoardSummary = { id: number; name: string; cardCount: number; updatedAt: string };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = { reply: string; board: BoardData | null };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// JSON requests; the session is an HttpOnly cookie the browser sends with each one
const request = async <T>(method: string, url: string, body?: unknown): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const { detail } = await response.json().catch(() => ({ detail: undefined }));
    throw new ApiError(response.status, typeof detail === "string" ? detail : `Request failed: ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
};

// Auth

export const getMe = () =>
  request<User>("GET", "/api/auth/me").catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  });

export const login = (username: string, password: string) =>
  request<User>("POST", "/api/auth/login", { username, password });

export const register = (username: string, password: string) =>
  request<User>("POST", "/api/auth/register", { username, password });

export const logout = () => request<void>("POST", "/api/auth/logout");

export const changePassword = (current: string, next: string) =>
  request<void>("PUT", "/api/auth/password", { current, new: next });

export const deleteAccount = () => request<void>("DELETE", "/api/auth/me");

// Boards

export const listBoards = () => request<BoardSummary[]>("GET", "/api/boards");

export const createBoard = (name: string) => request<BoardSummary>("POST", "/api/boards", { name });

export const renameBoard = (id: number, name: string) => request<BoardSummary>("PATCH", `/api/boards/${id}`, { name });

export const deleteBoard = (id: number) => request<void>("DELETE", `/api/boards/${id}`);

export const fetchBoard = (id: number) => request<BoardData>("GET", `/api/boards/${id}`);

let pendingSave: Promise<unknown> = Promise.resolve();

// Saves run one at a time, in order, so the latest change is always the one stored
export const saveBoard = (id: number, board: BoardData) => {
  const put = () => request<BoardData>("PUT", `/api/boards/${id}`, board);
  pendingSave = pendingSave.then(put, put);
  return pendingSave;
};

// The backend saves any board the AI returns, so the caller only needs to show it
export const sendChat = async (id: number, message: string, history: ChatMessage[]) => {
  // The backend reads the stored board, so let pending saves land first; a failed save doesn't block the chat
  await pendingSave.catch(() => {});
  return request<ChatResponse>("POST", `/api/boards/${id}/chat`, { message, history });
};
