const STORAGE_KEY = "pm-auth";
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const isLoggedIn = () => localStorage.getItem(STORAGE_KEY) === "true";

export const login = (username: string, password: string) => {
  if (username !== "user" || password !== "password") {
    return false;
  }
  localStorage.setItem(STORAGE_KEY, "true");
  notify();
  return true;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  notify();
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
