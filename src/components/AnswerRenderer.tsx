import React from "react";

const AnswerRenderer = ({ text }: { text: string }) => {
  const parseText = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const blocks: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Headings
      if (
        /^(what|how|why|top|summary|introduction|conclusion|key findings)/i.test(
          trimmed
        )
      ) {
        blocks.push(
          <h2
            key={`heading-${idx}`}
            className="text-lg font-semibold text-white mb-3 mt-6"
          >
            {trimmed} {addEmoji(trimmed)}
          </h2>
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(trimmed)) {
        const prev = blocks[blocks.length - 1];
        if (Array.isArray(prev)) {
          prev.push(
            <li key={`num-${idx}`} className="mb-2 text-gray-300">
              {trimmed.replace(/^\d+\.\s/, "")}
            </li>
          );
        } else {
          blocks.push(
            <ol
              key={`list-${idx}`}
              className="list-decimal pl-6 text-gray-300 mb-4"
            >
              <li className="mb-2">{trimmed.replace(/^\d+\.\s/, "")}</li>
            </ol>
          );
        }
      }
      // Bullet Points
      else if (/^[-*•]\s/.test(trimmed)) {
        const prev = blocks[blocks.length - 1];
        if (Array.isArray(prev)) {
          prev.push(
            <li key={`bullet-${idx}`} className="mb-2 text-gray-300">
              {trimmed.replace(/^[-*•]\s/, "")}
            </li>
          );
        } else {
          blocks.push(
            <ul
              key={`bullets-${idx}`}
              className="list-disc pl-6 text-gray-300 mb-4"
            >
              <li className="mb-2">{trimmed.replace(/^[-*•]\s/, "")}</li>
            </ul>
          );
        }
      }
      // Regular Paragraph
      else {
        blocks.push(
          <p key={`para-${idx}`} className="mb-4 text-gray-300 leading-relaxed">
            {trimmed}
          </p>
        );
      }

      // Divider after major sections
      if (
        idx < lines.length - 1 &&
        trimmed.length > 50 &&
        lines[idx + 1].trim().length <= 10
      ) {
        blocks.push(
          <hr key={`divider-${idx}`} className="my-6 border-white/10" />
        );
      }
    });

    return blocks;
  };

  const addEmoji = (heading: string) => {
    if (/news/i.test(heading)) return "📰";
    if (/trend/i.test(heading)) return "📊";
    if (/summary/i.test(heading)) return "📝";
    if (/introduction/i.test(heading)) return "👋";
    if (/conclusion/i.test(heading)) return "🔚";
    return "";
  };

  return <div className="prose prose-invert max-w-none">{parseText(text)}</div>;
};

export default AnswerRenderer;
