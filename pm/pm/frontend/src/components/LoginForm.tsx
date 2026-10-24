"use client";

import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(!login(username, password));
  };

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      <main className="relative flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Single Board Kanban
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Sign in
          </h1>
          <div className="mt-6 h-1 w-10 rounded-full bg-[var(--accent-yellow)]" />
          <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            />
          </label>
          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-[var(--secondary-purple)]">
              Invalid username or password.
            </p>
          )}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
};
