"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { ApiError, login, register, type User } from "@/lib/api";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "@/components/ui";

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
        "flex-1 cursor-pointer px-2 py-2.5 font-display text-[9px] transition-colors",
        mode === value
          ? "bg-[var(--navy-dark)] text-[var(--surface)]"
          : "text-[var(--ink-soft)] hover:bg-[var(--accent-yellow)] hover:text-[var(--navy-dark)]"
      )}
    >
      {label}
    </button>
  );

  return (
    // Title screen: a striped pixel sky over a strip of grass
    <div className="flex min-h-screen flex-col bg-[linear-gradient(to_bottom,var(--sky)_0_22%,#a3dcff_22%_42%,#b9e6ff_42%_60%,#cfefff_60%_76%,#e4f6ff_76%)]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="px-box w-full max-w-sm p-8">
          <p className="inline-flex items-center gap-2 border-[3px] border-[var(--navy-dark)] px-2.5 py-1.5 font-display text-[9px]">
            <span aria-hidden className="blink text-[var(--leaf-dark)]">&#9679;</span>
            Kanban Studio
          </p>
          <h1 className="mt-5 font-display text-xl leading-snug text-[var(--navy-dark)] [text-shadow:4px_4px_0_var(--accent-yellow)]">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <div role="tablist" className="mt-6 flex border-[3px] border-[var(--navy-dark)]">
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
            <p className="mt-3 text-xs leading-5 text-[var(--ink-soft)]">
              3-32 letters, numbers, dots, dashes or underscores. Passwords need at least 8 characters.
            </p>
          )}
          {error && (
            <p role="alert" className={clsx(errorClass, "mt-4")}>
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={clsx(primaryButtonClass, "mt-7 w-full py-3.5")}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </main>
      <div className="ground" />
    </div>
  );
};
