import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { mockApi } from "@/test/mockApi";

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApi();
  });

  it("shows the login form when logged out", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Kanban Studio")).not.toBeInTheDocument();
  });

  it("shows an error for wrong credentials", async () => {
    render(<Home />);
    await signIn("user", "wrong");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(screen.queryByText("Kanban Studio")).not.toBeInTheDocument();
  });

  it("shows the board after logging in", async () => {
    render(<Home />);
    await signIn("user", "password");
    expect(await screen.findByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
  });

  it("shows the board when already logged in", async () => {
    localStorage.setItem("pm-auth", "true");
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
  });

  it("returns to the login form after logging out", async () => {
    render(<Home />);
    await signIn("user", "password");
    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
