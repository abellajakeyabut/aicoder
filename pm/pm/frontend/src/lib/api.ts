import type { BoardData } from "@/lib/kanban";

export const fetchBoard = async (): Promise<BoardData> => {
  const response = await fetch("/api/board");
  if (!response.ok) {
    throw new Error(`Failed to load board: ${response.status}`);
  }
  return response.json();
};

let pendingSave: Promise<void> = Promise.resolve();

// Saves run one at a time, in order, so the latest change is always the one stored
export const saveBoard = (board: BoardData) => {
  const put = async () => {
    const response = await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(board),
    });
    if (!response.ok) {
      throw new Error(`Failed to save board: ${response.status}`);
    }
  };
  pendingSave = pendingSave.then(put, put);
  return pendingSave;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = { reply: string; board: BoardData | null };

// The backend saves any board the AI returns, so the caller only needs to show it
export const sendChat = async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
  // The backend reads the stored board, so let pending saves land first; a failed save doesn't block the chat
  await pendingSave.catch(() => {});
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) {
    throw new Error(`Chat failed: ${response.status}`);
  }
  return response.json();
};
