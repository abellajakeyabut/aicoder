import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDialog } from "@/components/AccountDialog";
import { DEMO_USER, mockApi, requests } from "@/test/mockApi";

const changePassword = async (current: string, next: string) => {
  await userEvent.type(screen.getByLabelText("Current password"), current);
  await userEvent.type(screen.getByLabelText("New password"), next);
  await userEvent.click(screen.getByRole("button", { name: "Change password" }));
};

describe("AccountDialog", () => {
  let fetchMock: ReturnType<typeof mockApi>;
  let onClose: ReturnType<typeof vi.fn>;
  let onDeleted: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockApi();
    onClose = vi.fn();
    onDeleted = vi.fn();
    render(<AccountDialog user={DEMO_USER} onClose={onClose} onDeleted={onDeleted} />);
  });

  it("changes the password and clears the form", async () => {
    await changePassword("password", "better-password");
    expect(await screen.findByRole("status")).toHaveTextContent("Password changed.");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      current: "password",
      new: "better-password",
    });
  });

  it("explains a wrong current password", async () => {
    await changePassword("wrong", "better-password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Your current password is wrong.");
  });

  it("explains a short new password", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: [] }, { status: 422 }));
    await changePassword("password", "short");
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
  });

  it("shows other password errors", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await changePassword("password", "better-password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change the password");
  });

  it("deletes the account only after confirming", async () => {
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep account" }));
    expect(requests(fetchMock)).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete everything" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(requests(fetchMock)).toEqual(["DELETE /api/auth/me"]);
  });

  it("shows an error when the account can't be deleted", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete everything" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete the account");
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("closes with Escape", async () => {
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
