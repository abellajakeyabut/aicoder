import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { ApiError, changePassword, deleteAccount, type User } from "@/lib/api";
import { dangerButtonClass, errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";

type AccountDialogProps = {
  user: User;
  onClose: () => void;
  onDeleted: () => void;
};

export const AccountDialog = ({ user, onClose, onDeleted }: AccountDialogProps) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handlePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setMessage({ error: false, text: "Password changed." });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setMessage({
        error: true,
        text:
          status === 403
            ? "Your current password is wrong."
            : status === 422
              ? "The new password needs at least 8 characters."
              : "Could not change the password. Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAccount();
      onDeleted();
    } catch {
      setMessage({ error: true, text: "Could not delete the account. Please try again." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1b2e99] px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        className="px-box w-full max-w-md p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-block bg-[var(--coral)] px-2 py-1 font-display text-[8px] text-white">Account</p>
            <h2 id="account-title" className="mt-3 truncate text-2xl font-bold text-[var(--navy-dark)]">
              {user.username}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-btn h-9 w-9"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handlePassword} className="mt-6 space-y-4">
          <h3 className="font-display text-[10px] text-[var(--navy-dark)]">Change password</h3>
          <label className={labelClass}>
            Current password
            <input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              className={clsx(inputClass, "mt-2")}
            />
          </label>
          <label className={labelClass}>
            New password
            <input
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              autoComplete="new-password"
              required
              className={clsx(inputClass, "mt-2")}
            />
          </label>
          {message && (
            <p
              role={message.error ? "alert" : "status"}
              className={message.error ? errorClass : "border-l-4 border-[var(--leaf-dark)] bg-[#5fd9a326] px-3 py-2 text-sm font-semibold text-[var(--leaf-dark)]"}
            >
              {message.text}
            </p>
          )}
          <button type="submit" className={primaryButtonClass}>
            Change password
          </button>
        </form>

        <div className="mt-7 border-t-4 border-dotted border-[var(--navy-dark)] pt-5">
          <h3 className="font-display text-[10px] text-[var(--navy-dark)]">Delete account</h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">This removes your account and all of your boards.</p>
          {confirmingDelete ? (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={handleDelete} className={dangerButtonClass}>
                Yes, delete everything
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className={secondaryButtonClass}>
                Keep account
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className={clsx(secondaryButtonClass, "mt-3")}>
              Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
