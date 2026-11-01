import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { mockApi } from "@/test/mockApi";

const fillIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
};

const signIn = async (username: string, password: string) => {
  await fillIn(username, password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

const createAccount = async (username: string, password: string) => {
  await userEvent.click(screen.getByRole("tab", { name: "Create account" }));
  await fillIn(username, password);
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
};

describe("Home", () => {
  beforeEach(() => localStorage.clear());

  it("shows the sign-in form when signed out", async () => {
    mockApi({ user: null });
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Boards" })).not.toBeInTheDocument();
  });

  it("shows an error for wrong credentials", async () => {
    mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    await signIn("user", "wrong");
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows the boards after signing in", async () => {
    mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    await signIn("user", "password");
    expect(await screen.findByRole("heading", { name: "My first board" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Boards" })).toHaveTextContent("user");
  });

  it("shows the boards when the session is still valid", async () => {
    mockApi();
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "My first board" })).toBeInTheDocument();
  });

  it("creates an account", async () => {
    mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    await createAccount("alice", "wonderland");
    expect(await screen.findByRole("navigation", { name: "Boards" })).toHaveTextContent("alice");
  });

  it("explains a taken username and a short password", async () => {
    mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    await createAccount("user", "password");
    expect(await screen.findByRole("alert")).toHaveTextContent("That username is taken.");

    await userEvent.clear(screen.getByLabelText("Username"));
    await userEvent.clear(screen.getByLabelText("Password"));
    await fillIn("alice", "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
  });

  it("clears the error when switching between sign in and create account", async () => {
    mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    await signIn("user", "wrong");
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
  });

  it("returns to the sign-in form after logging out", async () => {
    mockApi();
    render(<Home />);
    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows an error when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    render(<Home />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });

  it("shows a network error on sign in", async () => {
    const fetchMock = mockApi({ user: null });
    render(<Home />);
    await screen.findByRole("heading", { name: "Sign in" });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await signIn("user", "password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });
});
