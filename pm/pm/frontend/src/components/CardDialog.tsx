import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Pencil, Trash2, X } from "lucide-react";
import { CardDetails } from "@/components/CardDetails";
import { CardMeta } from "@/components/CardMeta";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import type { Card, Priority } from "@/lib/kanban";

type CardDialogProps = {
  card: Card;
  columnTitle: string;
  overdue: boolean;
  // Opened with the Edit button rather than by clicking the card
  editing: boolean;
  // While the AI works the card can't be changed
  locked: boolean;
  onSave: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onClose: () => void;
};

const sectionTitle = "font-mono text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]";

export const CardDialog = ({ card, columnTitle, overdue, editing: startEditing, locked, onSave, onDelete, onClose }: CardDialogProps) => {
  const [editing, setEditing] = useState(startEditing);
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState(card.priority ?? "");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");

  const edit = () => {
    setTitle(card.title);
    setSummary(card.summary);
    setDetails(card.details);
    setPriority(card.priority ?? "");
    setDueDate(card.dueDate ?? "");
    setEditing(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      id: card.id,
      title: title.trim(),
      summary: summary.trim(),
      details: details.trim(),
      priority: (priority || null) as Priority | null,
      dueDate: dueDate || null,
    });
    setEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1d1b2e99] px-4 py-10 sm:py-16"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-dialog-title"
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        className="px-box w-full max-w-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b-4 border-[var(--navy-dark)] bg-[var(--surface-2)] px-6 py-3">
          <p className="truncate bg-[var(--navy-dark)] px-2 py-1 font-display text-[8px] text-[var(--surface)]">
            {columnTitle}
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn h-9 w-9" autoFocus={!startEditing}>
            <X size={18} />
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <h2 id="card-dialog-title" className="font-display text-xs text-[var(--navy-dark)]">
              Edit card
            </h2>
            <label className={labelClass}>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
                className={clsx(inputClass, "mt-2 !text-base !font-bold")}
              />
            </label>
            <label className={labelClass}>
              Summary
              <input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="One line shown on the board"
                className={clsx(inputClass, "mt-2")}
              />
            </label>
            <div>
              <label className={labelClass}>
                Details
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={10}
                  placeholder={"Write paragraphs, or a list:\n- First point\n- Second point"}
                  aria-describedby="card-details-hint"
                  className={clsx(inputClass, "mt-2 resize-y leading-6")}
                />
              </label>
              <p id="card-details-hint" className="mt-1.5 text-xs text-[var(--gray-text)]">
                Leave a blank line between paragraphs. Start a line with - for a bullet.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className={clsx(inputClass, "mt-2")}>
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className={labelClass}>
                Due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={clsx(inputClass, "mt-2")}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button type="submit" disabled={locked} className={primaryButtonClass}>
                Save
              </button>
              <button type="button" onClick={startEditing ? onClose : () => setEditing(false)} className={secondaryButtonClass}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <h2 id="card-dialog-title" className="text-2xl font-bold leading-tight text-[var(--navy-dark)]">
              {card.title}
            </h2>
            <CardMeta card={card} overdue={overdue} />

            <section className="mt-6">
              <h3 className={sectionTitle}>Summary</h3>
              <p className="mt-2 text-[15px] leading-6 text-[var(--ink-soft)]">{card.summary || "No summary yet."}</p>
            </section>

            <section className="mt-6 border-t-4 border-dotted border-[var(--navy-dark)] pt-5">
              <h3 className={sectionTitle}>Details</h3>
              <div className="mt-3">
                {card.details ? (
                  <CardDetails text={card.details} />
                ) : (
                  <p className="text-[15px] text-[var(--gray-text)]">No details yet. Edit the card to add notes or a list.</p>
                )}
              </div>
            </section>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={edit} disabled={locked} className={primaryButtonClass}>
                <Pencil size={14} />
                Edit
              </button>
              <button type="button" onClick={() => onDelete(card.id)} disabled={locked} className={secondaryButtonClass}>
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
