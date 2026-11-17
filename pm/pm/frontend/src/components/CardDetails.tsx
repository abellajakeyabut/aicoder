// A card's details as paragraphs and bullet lists: blank lines separate paragraphs,
// lines starting with "- " or "* " are bullets
type Block = { bullets: boolean; lines: string[] };

const toBlocks = (text: string) => {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of text.split("\n")) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      current = null;
    } else if (current && current.bullets === Boolean(bullet)) {
      current.lines.push(bullet ? bullet[1] : line);
    } else {
      current = { bullets: Boolean(bullet), lines: [bullet ? bullet[1] : line] };
      blocks.push(current);
    }
  }
  return blocks;
};

export const CardDetails = ({ text }: { text: string }) => (
  <div className="space-y-3 text-[15px] leading-6 text-[var(--navy-dark)]">
    {toBlocks(text).map((block, index) =>
      block.bullets ? (
        <ul key={index} className="space-y-1.5">
          {block.lines.map((line, lineIndex) => (
            <li key={lineIndex} className="flex gap-2.5">
              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-[var(--primary-blue)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p key={index} className="whitespace-pre-line">
          {block.lines.join("\n")}
        </p>
      )
    )}
  </div>
);
