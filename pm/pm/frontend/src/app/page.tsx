"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthForm } from "@/components/AuthForm";
import { getMe, type User } from "@/lib/api";

export default function Home() {
  // undefined until the session check returns; null when signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getMe().then(setUser, () => setFailed(true));
  }, []);

  if (failed) {
    return (
      <p role="alert" className="p-12 text-sm font-medium text-[var(--secondary-purple)]">
        Could not reach the server. Check that it is running, then reload the page.
      </p>
    );
  }
  if (user === undefined) {
    return null;
  }
  return user ? <AppShell user={user} onSignOut={() => setUser(null)} /> : <AuthForm onSignedIn={setUser} />;
}
