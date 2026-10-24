"use client";

import { useSyncExternalStore } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { isLoggedIn, subscribe } from "@/lib/auth";

export default function Home() {
  // null during static prerender; the real value is read from localStorage on the client
  const loggedIn = useSyncExternalStore(subscribe, isLoggedIn, () => null);

  if (loggedIn === null) {
    return null;
  }
  return loggedIn ? <KanbanBoard /> : <LoginForm />;
}
