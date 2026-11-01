"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { ApiError, login, register, type User } from "@/lib/api";
import { errorClass, glowBackground, inputClass, labelClass, primaryButtonClass } from "@/components/ui";

type Mode = "signin" | "register";

const messageFor = (error: unknown, mode: Mode) => {
  if (error instanceof ApiError && error.status === 422) {
    return "Usernames are 3-32 letters, numbers, dots, dashes or underscores. Passwords need at least 8 characters.";
  }
  if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
    return mode === "signin" ? "Invalid username or password." : "That username is taken.";
  }
  return "Could not reach the server. Please try again.";
};

export const AuthForm = ({ onSignedIn }: { onSignedIn: (user: User) => void }) => {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      onSignedIn(await (mode === "signin" ? login : register)(username.trim(), password));
    } catch (caught) {
      setError(messageFor(caught, mode));
      setBusy(false);
    }
  };

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => switchMode(value)}
      className={clsx(
        "flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
        mode === value ? "bg-white text-[var(--navy-dark)] shadow-sm" : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="relative overflow-hidden">
      {glowBackground}
      <main className="relative flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">Kanban Studio</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <div className="mt-6 h-1 w-10 rounded-full bg-[var(--accent-yellow)]" />
          <div role="tablist" className="mt-6 flex gap-1 rounded-full bg-[var(--surface)] p-1">
            {tab("signin", "Sign in")}
            {tab("register", "Create account")}
          </div>
          <label className={clsx(labelClass, "mt-6")}>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              className={clsx(inputClass, "mt-2")}
            />
          </label>
          <label className={clsx(labelClass, "mt-4")}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              className={clsx(inputClass, "mt-2")}
            />
          </label>
          {mode === "register" && (
            <p className="mt-3 text-xs leading-5 text-[var(--gray-text)]">
              3-32 letters, numbers, dots, dashes or underscores. Passwords need at least 8 characters.
            </p>
          )}
          {error && (
            <p role="alert" className={clsx(errorClass, "mt-4")}>
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={clsx(primaryButtonClass, "mt-6 w-full py-3")}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </main>
    </div>
  );
};
