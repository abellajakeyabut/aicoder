import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

const initialFormState = { title: "", summary: "" };

type NewCardFormProps = {
  onAdd: (title: string, summary: string) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(formState.title.trim(), formState.summary.trim());
    setFormState(initialFormState);
    setIsOpen(false);
  };

  return (
    <div>
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="field"
            required
          />
          <textarea
            value={formState.summary}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, summary: event.target.value }))
            }
            placeholder="Summary"
            rows={2}
            className="field resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="btn btn-primary"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormState(initialFormState);
              }}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-[3px] border-dashed border-[var(--navy-dark)] px-3 py-2 font-mono text-xs font-bold uppercase text-[var(--navy-dark)] hover:border-solid hover:bg-[var(--accent-yellow)]"
        >
          <Plus size={15} />
          Add a card
        </button>
      )}
    </div>
  );
};
