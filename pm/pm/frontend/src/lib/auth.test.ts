import { isLoggedIn, login, logout, subscribe } from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => localStorage.clear());

  it("starts logged out", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("logs in with the correct credentials", () => {
    expect(login("user", "password")).toBe(true);
    expect(isLoggedIn()).toBe(true);
  });

  it("rejects wrong credentials", () => {
    expect(login("user", "wrong")).toBe(false);
    expect(login("admin", "password")).toBe(false);
    expect(isLoggedIn()).toBe(false);
  });

  it("logs out", () => {
    login("user", "password");
    logout();
    expect(isLoggedIn()).toBe(false);
  });

  it("notifies subscribers on login and logout", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    login("user", "password");
    logout();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    login("user", "password");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
