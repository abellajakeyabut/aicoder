export type Priority = "low" | "medium" | "high";

export type Card = {
  id: string;
  title: string;
  // Short text shown on the board
  summary: string;
  // Long free text shown in the card dialog: paragraphs and "- " bullet lines
  details: string;
  priority: Priority | null;
  dueDate: string | null; // YYYY-MM-DD
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
};

export const initialData: BoardData = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    {
      id: "col-progress",
      title: "In Progress",
      cardIds: ["card-4", "card-5", "card-6"],
    },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      summary: "Draft quarterly themes with impact statements and metrics.",
      details: "Turn the strategy offsite notes into three to five themes for next quarter. Each theme needs a one-line impact statement the whole team can repeat.\n\n- Pull the top asks from the offsite board\n- Pair each theme with one leading metric\n- Review with product leads before Friday",
      priority: "high",
      dueDate: "2026-11-14",
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      summary: "Review support tags, sales notes, and churn feedback.",
      details: "Collect what customers are telling us across every channel, so discovery starts from evidence rather than opinion.\n\n- Export the last 90 days of support tags\n- Skim sales call notes for repeated objections\n- Summarize churn survey comments by theme",
      priority: null,
      dueDate: null,
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      summary: "Sketch initial dashboard layout and key drill-downs.",
      details: "A clickable prototype of the analytics view, good enough to test with five customers.\n\nStart from the overview: usage over time and the three numbers people check most. Drill-downs open from each number.",
      priority: "medium",
      dueDate: null,
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      summary: "Standardize column labels and tone across the board.",
      details: "",
      priority: "medium",
      dueDate: "2026-11-07",
    },
    "card-5": {
      id: "card-5",
      title: "Design card layout",
      summary: "Add hierarchy and spacing for scanning dense lists.",
      details: "Cards should be easy to scan in a dense column.\n\n- Title on top, bold\n- One-line summary underneath\n- Priority and due date as small badges",
      priority: "low",
      dueDate: null,
    },
    "card-6": {
      id: "card-6",
      title: "QA micro-interactions",
      summary: "Verify hover, focus, and loading states.",
      details: "- Hover and focus states on every button\n- Loading and empty states\n- Keyboard navigation through the board",
      priority: "high",
      dueDate: "2026-11-03",
    },
    "card-7": {
      id: "card-7",
      title: "Ship marketing page",
      summary: "Final copy approved and asset pack delivered.",
      details: "",
      priority: null,
      dueDate: null,
    },
    "card-8": {
      id: "card-8",
      title: "Close onboarding sprint",
      summary: "Document release notes and share internally.",
      details: "Release notes are in the shared drive. Share them in the team channel and close the sprint in the tracker.",
      priority: null,
      dueDate: null,
    },
  },
};

// overId is a card or a column. Dropped on a card, the moved card takes its place;
// dropped on a column, it goes to the end
export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const overColumn = columns.find(
    (column) => column.id === overId || column.cardIds.includes(overId)
  );
  if (!overColumn || !columns.some((column) => column.cardIds.includes(activeId))) {
    return columns;
  }

  const index =
    overColumn.id === overId
      ? overColumn.cardIds.length
      : overColumn.cardIds.indexOf(overId);

  return columns.map((column) => {
    const cardIds = column.cardIds.filter((cardId) => cardId !== activeId);
    if (column.id === overColumn.id) {
      cardIds.splice(index, 0, activeId);
    }
    return { ...column, cardIds };
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};

// Today as YYYY-MM-DD in local time, comparable with dueDate strings
export const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isOverdue = (card: Card, on: string) => card.dueDate !== null && card.dueDate < on;

export const formatDueDate = (dueDate: string) =>
  new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
