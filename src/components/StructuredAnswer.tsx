import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";

type Source = { title: string; url: string; snippet?: string; image?: string };

type StructuredAnswerProps = {
  topic?: string;
  answerText: string; // plain text from agentic JSON's answer field
  sources?: Source[];
  images?: string[]; // optional images to render inline if provided
  className?: string;
};

// Heuristic parser to split the answer into sections and lists
function parseSections(text: string) {
  const cleaned = text.replace(/\r/g, "").trim();
  const lines = cleaned.split("\n");

  // Detect section headers like "Overview:", "Key Points:" etc.
  const sections: { title?: string; content: string[] }[] = [];
  let current: { title?: string; content: string[] } = { content: [] };

  const headerRe =
    /^(overview|key points|what this means|caveats|next steps|summary|introduction|conclusion)\s*:/i;
  const mdHeaderRe = /^(#{1,3})\s+(.+)/; // #, ##, ### headings

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      current.content.push("");
      continue;
    }
    // Markdown heading handling
    const md = line.match(mdHeaderRe);
    if (md) {
      // Push previous section if it has content
      if (current.content.length) sections.push(current);
      const depth = md[1].length; // 1,2,3
      const title = md[2].trim();
      // Start a new section for any heading depth; simple flatten
      current = { title, content: [] };
      continue;
    }
    const header = line.match(headerRe);
    if (header) {
      if (current.content.length) sections.push(current);
      current = { title: header[1], content: [] };
      const rest = line.replace(headerRe, "").trim();
      if (rest) current.content.push(rest);
    } else {
      current.content.push(line);
    }
  }
  if (current.content.length) sections.push(current);

  // If no explicit sections found, create one default section from text
  const hasExplicit = sections.some((s) => s.title);
  if (!hasExplicit) {
    return [
      {
        title: "Overview",
        content: cleaned.split(/\n\n+/).map((s) => s.trim()),
      },
    ];
  }
  return sections;
}

function toParagraphBlocks(lines: string[]) {
  // Group lines into paragraphs, lists, or numbered lists
  const blocks: Array<
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] }
  > = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim();
    if (!line) {
      i++;
      continue;
    }

    // Unordered list run
    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i]?.trim() || "")) {
        items.push((lines[i] as string).trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list run
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]?.trim() || "")) {
        items.push((lines[i] as string).trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph: accumulate until blank line
    const paras: string[] = [];
    while (i < lines.length && (lines[i]?.trim() || "") !== "") {
      // detect markdown table start: header line contains '|' and next line is separator like |---|---|
      const next = lines[i + 1] || "";
      if (lines[i].includes("|") && /^\s*[:\-\| ]+\s*$/.test(next)) {
        // parse table
        const headerLine = lines[i];
        const sepLine = next;
        i += 2; // consume header and separator
        const headers = headerLine
          .split("|")
          .map((h) => h.trim())
          .filter(Boolean);
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes("|")) {
          // keep empty cells (don't filter out) but remove leading/trailing empty segments caused by surrounding pipes
          let cells = lines[i].split("|").map((c) => c.trim());
          if (cells.length > 0 && cells[0] === "") cells = cells.slice(1);
          if (cells.length > 0 && cells[cells.length - 1] === "")
            cells = cells.slice(0, -1);
          // ensure row has same length as headers by truncating or padding with empty strings
          cells = cells.slice(0, headers.length);
          while (cells.length < headers.length) cells.push("");
          rows.push(cells);
          i++;
        }
        blocks.push({ type: "table", headers, rows });
        continue;
      }
      paras.push((lines[i] as string).trim());
      i++;
    }
    blocks.push({ type: "p", text: paras.join(" ") });
  }
  return blocks;
}

// helper: find sources referenced in a text block by url or hostname
function findSourcesForText(text: string, sources: Source[]) {
  if (!text || !sources?.length) return [] as number[];
  const out: number[] = [];
  const lowered = text.toLowerCase();
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    try {
      if (!s || !s.url) continue;
      const u = s.url.toLowerCase();
      const hostname = new URL(s.url).hostname.toLowerCase();
      if (
        lowered.includes(u) ||
        lowered.includes(hostname) ||
        lowered.includes(s.title?.toLowerCase?.() || "")
      ) {
        out.push(i + 1);
      }
    } catch (e) {
      // fallback: check if source url appears as plain text
      if (s.url && lowered.includes(s.url.toLowerCase())) out.push(i + 1);
    }
  }
  return out;
}

// Render paragraph text with inline source badges (attempt to place badges next to matched substrings)
function renderTextWithInlineBadges(text: string, sources: Source[]) {
  if (!text) return [text];
  const nodes: Array<string | JSX.Element> = [];
  const lowered = text.toLowerCase();
  // collect matches as {pos, len, index}
  const matches: {
    pos: number;
    len: number;
    idx: number;
    matchText: string;
  }[] = [];
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s || !s.url) continue;
    try {
      const hostname = new URL(s.url).hostname.toLowerCase();
      const title = (s.title || "").toLowerCase();
      const candidates = [s.url.toLowerCase(), hostname, title].filter(Boolean);
      for (const cand of candidates) {
        const pos = lowered.indexOf(cand);
        if (pos >= 0) {
          matches.push({
            pos,
            len: cand.length,
            idx: i,
            matchText: text.substr(pos, cand.length),
          });
          break;
        }
      }
    } catch (e) {
      // fallback: match plain url string
      const cand = s.url.toLowerCase();
      const pos = lowered.indexOf(cand);
      if (pos >= 0)
        matches.push({
          pos,
          len: cand.length,
          idx: i,
          matchText: text.substr(pos, cand.length),
        });
    }
  }

  // sort matches and deduplicate by index
  matches.sort((a, b) => a.pos - b.pos || a.idx - b.idx);
  const seen = new Set<number>();
  const filtered: typeof matches = [];
  for (const m of matches)
    if (!seen.has(m.idx)) {
      filtered.push(m);
      seen.add(m.idx);
    }

  if (filtered.length === 0) {
    nodes.push(text);
    return nodes;
  }

  let cursor = 0;
  for (const m of filtered) {
    if (m.pos > cursor) nodes.push(text.slice(cursor, m.pos));
    // push the matched substring
    nodes.push(text.slice(m.pos, m.pos + m.len));
    // push badge
    const sourceIndex = m.idx;
    nodes.push(
      <a
        key={`s-${m.pos}-${sourceIndex}`}
        href={sources[sourceIndex].url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-[10px] font-medium w-4 h-4 border border-gray-300 dark:border-white/10"
        title={sources[sourceIndex].title || sources[sourceIndex].url}
      >
        {sourceIndex + 1}
      </a>
    );
    cursor = m.pos + m.len;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export default function StructuredAnswer({
  topic,
  answerText,
  sources = [],
  images,
  className = "",
}: StructuredAnswerProps) {
  const sections = useMemo(() => parseSections(answerText), [answerText]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  // Close sources on ESC
  useEffect(() => {
    if (!sourcesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSourcesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourcesOpen]);

  // Derive hero heading (don't show the default literal "Answer")
  const heading = topic || sections[0]?.title || "";

  // Extract overview text for the first paragraph preview
  const overviewBlocks = useMemo(
    () => toParagraphBlocks(sections[0]?.content || []),
    [sections]
  );

  // Optional: limit to a few images to keep layout clean
  const inlineImages = (images || []).slice(0, 3);

  // Remove simple inline markdown tokens from text for clean display
  const sanitizeInline = (t: string) =>
    (t || "")
      // Remove ATX-style markdown headings like '# Title' or '### Sub'
      .replace(/^#{1,6}\s+/gm, "")
      // Remove setext-style underline headers (=== or --- lines)
      .replace(/^[=-]{2,}\s*$/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1") // bold
      .replace(/__(.*?)__/g, "$1") // underline/strong
      .replace(/\*(.*?)\*/g, "$1") // italic
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/~~(.*?)~~/g, "$1") // strikethrough
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1"); // markdown link -> text

  return (
    <div className={`text-left ai-answer-font ${className}`}>
      {/* Big heading (only render if present) */}
      {heading ? (
        <h2 className="title-font text-xl md:text-2xl font-bold text-white mb-3">
          {heading}
        </h2>
      ) : null}

      {/* Short overview paragraph */}
      {overviewBlocks?.length > 0 && overviewBlocks[0]?.type === "p" && (
        <p className="text-base md:text-sm text-white/90 leading-relaxed mb-6">
          {sanitizeInline(overviewBlocks[0].text)}
        </p>
      )}

      {/* Optional inline images */}
      {inlineImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {inlineImages.map((src, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
            >
              <img
                src={src}
                alt={`related ${i + 1}`}
                className="w-full h-24 object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Sections with spacing and lists */}
      <div className="space-y-8">
        {sections.map((sec, idx) => {
          const blocks = toParagraphBlocks(sec.content || []);
          const showTitle = idx !== 0 || !!sec.title;
          const titleText =
            sec.title &&
            sec.title.charAt(0).toUpperCase() +
              sec.title.slice(1).toLowerCase();
          return (
            <div
              key={idx}
              className={idx === 0 ? "" : "pt-6 border-t border-white/10"}
            >
              {showTitle && sec.title && (
                <h3 className="title-font text-base md:text-lg font-semibold text-white mb-3">
                  {sanitizeInline(titleText || "")}
                </h3>
              )}
              <div className="space-y-4">
                {blocks.map((b, i) => {
                  // for paragraph blocks, detect and render inline source badges
                  if (b.type === "p") {
                    const raw = b.text || "";
                    const sanitized = sanitizeInline(raw);
                    const nodes = renderTextWithInlineBadges(
                      sanitized,
                      sources
                    );
                    return (
                      <p
                        key={i}
                        className="text-white/90 leading-relaxed text-base"
                      >
                        {nodes.map((n, idx) =>
                          typeof n === "string" ? (
                            <span key={idx}>{n}</span>
                          ) : (
                            <span key={idx}>{n}</span>
                          )
                        )}
                      </p>
                    );
                  }
                  if (b.type === "ul") {
                    return (
                      <ul
                        key={i}
                        className="list-disc pl-5 text-white/90 space-y-2 text-base"
                      >
                        {b.items.map((it, j) => (
                          <li key={j}>{sanitizeInline(it)}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (b.type === "ol") {
                    return (
                      <ol
                        key={i}
                        className="list-decimal pl-5 text-white/90 space-y-2 text-base"
                      >
                        {b.items.map((it, j) => (
                          <li key={j}>{sanitizeInline(it)}</li>
                        ))}
                      </ol>
                    );
                  }

                  if (b.type === "table") {
                    // Responsive table: compact desktop table using shared Table components
                    // and a stacked card layout for mobile (better readability on small screens).
                    return (
                      <div key={i} className="w-full">
                        {/* Desktop / tablet table */}
                        <div className="hidden md:block w-full overflow-auto rounded-sm border border-gray-700 bg-transparent">
                          <Table className="min-w-full">
                            <TableHeader>
                              <tr>
                                {b.headers.map((h, hi) => (
                                  <TableHead
                                    key={hi}
                                    className={
                                      (b.headers.length === 2 && hi === 0
                                        ? "w-1/3 "
                                        : "") +
                                      "h-10 px-3 md:px-4 text-sm md:text-base font-medium text-muted-foreground"
                                    }
                                  >
                                    {sanitizeInline(h)}
                                  </TableHead>
                                ))}
                              </tr>
                            </TableHeader>
                            <TableBody>
                              {b.rows.map((r, ri) => (
                                <TableRow key={ri}>
                                  {b.headers.map((_, ci) => (
                                    <TableCell
                                      key={ci}
                                      className={
                                        "p-2 md:p-3 align-top " +
                                        (ci === 0
                                          ? "font-medium text-gray-100 text-base"
                                          : "text-gray-300 text-base")
                                      }
                                    >
                                      {sanitizeInline((r && r[ci]) || "")}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile stacked view */}
                        <div className="md:hidden w-full space-y-2">
                          {b.rows.map((r, ri) => (
                            <div
                              key={ri}
                              className="p-3 bg-card/50 border border-gray-800 rounded-md"
                            >
                              {b.headers.map((h, hi) => (
                                <div key={hi} className="mb-2">
                                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                                    {sanitizeInline(h)}
                                  </div>
                                  <div className="mt-1 text-base text-white/90">
                                    {sanitizeInline((r && r[hi]) || "")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sources pill and slide-over panel */}
      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={() => setSourcesOpen(true)}
          className="px-4 py-2 rounded-full bg-card/80 border border-gray-200 dark:border-white/10 shadow-sm text-sm font-medium hover:bg-card/90 transition"
        >
          Sources
        </button>
      </div>

      {sourcesOpen && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center p-6">
          {/* Backdrop */}
          <div
            onClick={() => setSourcesOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          {/* Center Panel (history style) */}
          <div className="relative w-full max-w-2xl bg-white/6 backdrop-blur-md rounded-lg overflow-hidden shadow-2xl border border-white/10 z-10 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold tracking-wide text-white">
                Sources
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSourcesOpen(false)}
                  className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-white/5">
              {sources.map((s, i) => {
                let domain = "";
                try {
                  domain = new URL(s.url).hostname;
                } catch {}
                const favicon = domain
                  ? `https://icons.duckduckgo.com/ip3/${domain}.ico`
                  : undefined;
                return (
                  <div
                    key={i}
                    className="flex items-stretch gap-4 px-4 py-4 hover:bg-white/5 transition group"
                  >
                    {/* Left cluster: favicon + index */}
                    <div className="flex flex-col items-center w-10 relative flex-shrink-0">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-9 h-9 rounded-md bg-white/60 dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-sm hover:shadow"
                        title={domain || s.url}
                      >
                        {favicon ? (
                          <img
                            src={favicon}
                            alt={domain || "favicon"}
                            className="w-full h-full object-contain p-1"
                            loading="lazy"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {(domain || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </a>
                      <span className="absolute -bottom-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center text-white font-semibold shadow">
                        {i + 1}
                      </span>
                    </div>
                    {/* Middle content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm font-normal text-white hover:underline whitespace-normal break-words"
                      >
                        {s.title || s.url}
                      </a>
                      {s.snippet && (
                        <p className="text-sm text-white/80 leading-relaxed">
                          {s.snippet}
                        </p>
                      )}
                      <div className="text-[12px] text-white/60 truncate">
                        {domain}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition ease-out text-[10px]">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => navigator?.clipboard?.writeText(s.url)}
                          className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>
                    {/* Right: image (fixed slot to keep alignment) */}
                    <div className="hidden sm:flex w-28 h-20 rounded-md overflow-hidden border border-white/10 bg-white/5 flex-shrink-0 items-center justify-center">
                      {s.image ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="w-full h-full group/image block"
                        >
                          <img
                            src={s.image}
                            alt={s.title || "preview"}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-[1.03]"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </a>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sources.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No sources available.
                </div>
              )}
            </div>
            <div className="px-4 py-3 text-[11px] text-white/60 border-t border-white/5 flex items-center justify-start">
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
