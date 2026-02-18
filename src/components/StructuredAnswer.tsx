import React, { useEffect, useMemo, useRef, useState } from "react";
import EntityCard, { AnyEntity } from "./entity-cards/EntityCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Source = { title: string; url: string; snippet?: string; image?: string };

type StructuredAnswerProps = {
  topic?: string;
  answerText: string;
  sources?: Source[];
  images?: string[];
  className?: string;
  onPlayToggle?: (text?: string, lang?: string) => void;
  isPlaying?: boolean;
  onCopy?: (text?: string) => void;
};

// Detect if incoming text likely contains markdown. Broadened table regex so a table
// at the end of the string without trailing newline still triggers markdown mode.
function hasMarkdownStructure(text: string) {
  if (!text) return false;
  const t = text.trim();
  const tablePattern = /(^|\n)\|[^\n]+\|\n\s*[-:| ]+(?:\n|$)/; // improved
  return (
    /(^|\n)#{1,6}\s+/.test(t) ||
    /(^|\n)\s*[-*•]\s+/.test(t) ||
    /(^|\n)\s*\d+\.\s+/.test(t) ||
    tablePattern.test(t)
  );
}

// Reusable markdown table component with copy-to-clipboard support.
const MarkdownTable: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({
  children,
  ...props
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const copy = () => {
    const tableEl = tableRef.current;
    if (!tableEl) return;
    const headers = Array.from(tableEl.querySelectorAll("thead th")).map(
      (th) => th.textContent || ""
    );
    const rows = Array.from(tableEl.querySelectorAll("tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => td.textContent || "")
    );
    if (!headers.length && tableEl.querySelectorAll("tr").length) {
      // Fallback if thead missing
      const firstRow = tableEl.querySelector("tr");
      if (firstRow) {
        const cells = Array.from(firstRow.querySelectorAll("th,td")).map(
          (td) => td.textContent || ""
        );
        headers.push(...cells);
      }
    }
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(",")
      ),
    ]
      .filter(Boolean)
      .join("\n");
    navigator?.clipboard?.writeText(csv).catch(() => {
      const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))]
        .filter(Boolean)
        .join("\n");
      navigator?.clipboard?.writeText(tsv);
    });
  };
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200/50 dark:border-white/20 bg-white/50 dark:bg-white/5 shadow-sm group relative">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 hidden group-hover:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-black/60 text-white border border-white/10 hover:bg-black/70 transition-all"
        title="Copy table as CSV"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        Copy
      </button>
      <table ref={tableRef} className="min-w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  );
};

function parseSections(text: string) {
  const cleaned = (text || "").replace(/\r/g, "").trim();
  const lines = cleaned.split("\n");
  const sections: { title?: string; content: string[] }[] = [];
  let current: { title?: string; content: string[] } = { content: [] };
  const mdHeaderRe = /^(#{1,3})\s+(.+)/; // #, ##, ###
  const colonHeaderRe =
    /^(overview|summary|introduction|conclusion|key points|highlights|takeaways)\s*:/i;
  for (const raw of lines) {
    const line = (raw || "").trim();
    if (!line) {
      current.content.push("");
      continue;
    }
    const md = line.match(mdHeaderRe);
    if (md) {
      if (current.content.length) sections.push(current);
      current = { title: md[2].trim(), content: [] };
      continue;
    }
    const c = line.match(colonHeaderRe);
    if (c) {
      if (current.content.length) sections.push(current);
      current = { title: c[1], content: [] };
      const rest = line.replace(colonHeaderRe, "").trim();
      if (rest) current.content.push(rest);
      continue;
    }
    current.content.push(line);
  }
  if (current.content.length) sections.push(current);
  const hasAnyTitle = sections.some((s) => !!s.title);
  if (!hasAnyTitle) {
    return [{ title: "Overview", content: cleaned.split(/\n\n+/) }];
  }
  return sections;
}

function toBlocks(lines: string[]) {
  const blocks: Array<
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] }
  > = [];
  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] || "").trim();
    if (!line) {
      i++;
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test((lines[i] || "").trim())) {
        items.push((lines[i] as string).trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] || "").trim())) {
        items.push((lines[i] as string).trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const next = lines[i + 1] || "";
    if (line.includes("|") && /^\s*[:\-| ]+\s*$/.test(next)) {
      const headers = line
        .split("|")
        .map((h) => h.trim())
        .filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] || "").includes("|")) {
        let cells = (lines[i] as string).split("|").map((c) => c.trim());
        if (cells[0] === "") cells = cells.slice(1);
        if (cells[cells.length - 1] === "") cells = cells.slice(0, -1);
        cells = cells.slice(0, headers.length);
        while (cells.length < headers.length) cells.push("");
        rows.push(cells);
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && (lines[i] || "").trim() !== "") {
      buf.push((lines[i] as string).trim());
      i++;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

function renderTextWithInlineBadges(
  text: string,
  sources: Source[],
  activeSource: number | null
) {
  if (!text || !sources?.length) return [text] as Array<string | JSX.Element>;
  const nodes: Array<string | JSX.Element> = [];
  const lowered = text.toLowerCase();
  const matches: { pos: number; len: number; idx: number }[] = [];
  sources.forEach((s, idx) => {
    if (!s?.url) return;
    try {
      const hostname = new URL(s.url).hostname.toLowerCase();
      const title = (s.title || "").toLowerCase();
      const cands = [s.url.toLowerCase(), hostname, title].filter(Boolean);
      for (const c of cands) {
        const p = lowered.indexOf(c);
        if (p >= 0) {
          matches.push({ pos: p, len: c.length, idx });
          break;
        }
      }
    } catch {}
  });
  matches.sort((a, b) => a.pos - b.pos || a.idx - b.idx);
  const seen = new Set<number>();
  const uniq = matches.filter((m) =>
    seen.has(m.idx) ? false : (seen.add(m.idx), true)
  );
  if (!uniq.length) return [text];
  let cursor = 0;
  uniq.forEach((m) => {
    if (m.pos > cursor) nodes.push(text.slice(cursor, m.pos));
    nodes.push(text.slice(m.pos, m.pos + m.len));
    const active = activeSource === m.idx;
    const s = sources[m.idx];
    let domain = "";
    try {
      domain = new URL(s.url).hostname.replace(/^www\./, "");
    } catch {}
    const ico = domain ? faviconUrl(domain) : "";
    nodes.push(
      <a
        key={`${m.pos}-${m.idx}`}
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className={
          "ml-1 inline-flex items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors duration-150 " +
          (active
            ? "bg-indigo-600 border-indigo-500 text-white"
            : "bg-gray-100/80 border-gray-300/60 text-gray-700 hover:bg-gray-200/60 dark:bg-white/10 dark:border-white/20 dark:text-white/90 dark:hover:bg-white/15")
        }
        style={{ width: 16, height: 16 }}
        title={s.title || s.url}
      >
        {ico ? (
          <img
            src={ico}
            alt={domain || "ico"}
            className="w-full h-full object-contain"
            onError={(e) =>
              ((e.currentTarget as HTMLImageElement).style.display = "none")
            }
          />
        ) : (
          <span className="text-[8px] leading-none">•</span>
        )}
      </a>
    );
    cursor = m.pos + m.len;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function sanitizeInline(t: string) {
  if (!t) return t;
  return t.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
}

// Parse inline S-refs like "S1 S2, S3" and group adjacent refs
function parseInlineSRefs(text: string) {
  // Strip square brackets around pure S-refs e.g., "[S1, S2]" -> "S1, S2"
  text = text.replace(/\[\s*(S\d+(?:\s*[,/|]\s*S\d+)*)\s*\]/g, "$1");
  const segments: Array<
    { type: "text"; text: string } | { type: "srefs"; indices: number[] }
  > = [];
  if (!text) return [{ type: "text", text }] as typeof segments;
  const re = /S(\d+)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let currentGroup: number[] = [];
  let lastEnd = -1;
  while ((m = re.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    const idx = parseInt(m[1], 10) - 1;
    const between = text.slice(lastEnd, start);
    const isAdjacent = lastEnd >= 0 && /^([,\s/|]+)?$/.test(between);
    if (currentGroup.length === 0) {
      if (start > lastIndex)
        segments.push({ type: "text", text: text.slice(lastIndex, start) });
      currentGroup.push(idx);
    } else if (isAdjacent) {
      currentGroup.push(idx);
    } else {
      segments.push({ type: "srefs", indices: currentGroup });
      if (start > lastIndex)
        segments.push({ type: "text", text: text.slice(lastIndex, start) });
      currentGroup = [idx];
    }
    lastEnd = end;
    lastIndex = end;
  }
  if (currentGroup.length)
    segments.push({ type: "srefs", indices: currentGroup });
  if (lastIndex < text.length)
    segments.push({ type: "text", text: text.slice(lastIndex) });
  return segments;
}

function getDomain(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrl(domain: string) {
  return domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : "";
}

function SChip({
  index,
  source,
  active,
  setActive,
}: {
  index: number;
  source?: Source;
  active?: boolean;
  setActive?: (i: number | null) => void;
}) {
  const domain = getDomain(source?.url);
  const href = source?.url || undefined;
  const className = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ml-1 shadow-sm backdrop-blur-sm ${
    active
      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
      : "bg-gray-100/80 border-gray-300/60 text-gray-900 hover:bg-gray-200/60 dark:bg-white/10 dark:border-white/20 dark:text-foreground/80 dark:hover:bg-white/15"
  }`;
  const inner = (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center justify-center rounded-full w-4 h-4 overflow-hidden border shadow-sm ${
          active
            ? "bg-indigo-600 border-indigo-500"
            : "bg-gray-200/80 border-gray-300/60 dark:bg-white/10 dark:border-white/20"
        }`}
      >
        {domain ? (
          <img
            src={faviconUrl(domain)}
            alt={domain}
            className="w-full h-full object-contain"
            onError={(e) =>
              ((e.currentTarget as HTMLImageElement).style.display = "none")
            }
          />
        ) : (
          <span className="text-[8px] leading-none">•</span>
        )}
      </span>
      {domain ? (
        <span className="hidden sm:inline truncate max-w-[8rem]">{domain}</span>
      ) : null}
    </span>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} no-underline`}
      onMouseEnter={() => setActive?.(index)}
      onMouseLeave={() => setActive?.(null)}
      title={source?.title || href}
    >
      {inner}
    </a>
  ) : (
    <span className={className}>{inner}</span>
  );
}

function GroupedSChip({
  indices,
  sources,
  setActive,
}: {
  indices: number[];
  sources: Source[];
  setActive?: (i: number | null) => void;
}) {
  const first = indices[0] ?? 0;
  const extra = indices.length - 1;
  const firstSource = sources[first];
  const domain = getDomain(firstSource?.url);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const clearCloseTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const delayedClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(
      () => setOpen(false),
      150
    ) as unknown as number;
  };
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ml-1 cursor-default shadow-sm backdrop-blur-sm bg-gray-100/80 border-gray-300/60 text-gray-900 hover:bg-gray-200/60 dark:bg-white/10 dark:border-white/20 dark:text-foreground/80 dark:hover:bg-white/15"
            onMouseEnter={() => {
              clearCloseTimer();
              setOpen(true);
            }}
            onMouseLeave={delayedClose}
          >
            <span className="inline-flex items-center justify-center rounded-full w-4 h-4 overflow-hidden border shadow-sm bg-gray-200/80 border-gray-300/60 dark:bg-white/10 dark:border-white/20">
              {domain ? (
                <img
                  src={faviconUrl(domain)}
                  alt={domain}
                  className="w-full h-full object-contain"
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).style.display =
                      "none")
                  }
                />
              ) : (
                <span className="text-[8px] leading-none">•</span>
              )}
            </span>
            {extra > 0 && (
              <span className="text-[9px] opacity-80">+{extra}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="p-0 overflow-hidden rounded-lg border backdrop-blur-md shadow-2xl border-gray-200/80 bg-white/80 text-gray-900 dark:border-white/10 dark:bg-white/10 dark:text-foreground"
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={delayedClose}
        >
          <div className="w-72">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-foreground/70 border-b border-white/10">
              Used Sources
            </div>
            <div className="max-h-72 overflow-auto">
              {indices.map((i) => {
                const s = sources[i];
                const d = getDomain(s?.url);
                const ico = faviconUrl(d);
                if (!s) return null;
                return (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 no-underline"
                    onMouseEnter={() => setActive?.(i)}
                    onMouseLeave={() => setActive?.(null)}
                  >
                    <span className="w-5 h-5 rounded bg-white/20 border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {ico ? (
                        <img
                          src={ico}
                          alt={d || "ico"}
                          className="w-full h-full object-contain"
                          onError={(e) =>
                            ((
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none")
                          }
                        />
                      ) : (
                        <span className="text-[10px]">
                          {(d || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs truncate">
                        {s.title || d || s.url}
                      </span>
                      {d ? (
                        <span className="block text-[11px] text-foreground/70 truncate">
                          {d}
                        </span>
                      ) : null}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      className="opacity-60"
                      fill="currentColor"
                    >
                      <path d="M9.29 6.71a1 1 0 011.42 0l4 4a1 1 0 010 1.42l-4 4a1 1 0 11-1.42-1.42L12.59 12 9.29 8.12a1 1 0 010-1.41z" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function renderParagraphNodes(
  text: string,
  sources: Source[],
  activeSource: number | null,
  setActive?: (i: number | null) => void,
  collectIndices?: (indices: number[]) => void
) {
  const segments = parseInlineSRefs(text);
  const nodes: Array<string | JSX.Element> = [];
  segments.forEach((seg, idx) => {
    if (seg.type === "text") {
      const parts = renderTextWithInlineBadges(seg.text, sources, activeSource);
      parts.forEach((p, j) =>
        nodes.push(
          typeof p === "string"
            ? p
            : React.cloneElement(p as any, { key: `${idx}-${j}` })
        )
      );
    } else {
      const valid = seg.indices.filter((i) => i >= 0 && i < sources.length);
      if (collectIndices && valid.length) collectIndices(valid);
      if (valid.length <= 1) {
        const i = valid[0] ?? -1;
        nodes.push(
          <SChip
            key={`s-${idx}-${i}`}
            index={i}
            source={sources[i]}
            active={activeSource === i}
            setActive={setActive}
          />
        );
      } else {
        nodes.push(
          <GroupedSChip
            key={`sg-${idx}`}
            indices={valid}
            sources={sources}
            setActive={setActive}
          />
        );
      }
    }
  });
  return nodes;
}

function renderChildrenWithInlineSRefs(
  children: React.ReactNode,
  sources: Source[],
  activeSource: number | null,
  setActiveSource?: (i: number | null) => void,
  collectIndices?: (indices: number[]) => void
): React.ReactNode {
  const process = (node: React.ReactNode, keyPrefix = "k"): React.ReactNode => {
    if (typeof node === "string") {
      const parts = renderParagraphNodes(
        node,
        sources,
        activeSource,
        setActiveSource,
        collectIndices
      );
      return parts.map((p, idx) =>
        typeof p === "string" ? (
          <span key={`${keyPrefix}-${idx}`}>{p}</span>
        ) : (
          React.cloneElement(p as any, { key: `${keyPrefix}-${idx}` })
        )
      );
    }
    if (Array.isArray(node)) {
      return node.map((n, i) => process(n, `${keyPrefix}-${i}`));
    }
    if (React.isValidElement(node)) {
      const child = (node as any).props?.children;
      if (child == null) return node;
      return React.cloneElement(
        node as any,
        undefined,
        process(child, `${keyPrefix}-c`)
      );
    }
    return node;
  };
  return process(children);
}

export default function StructuredAnswer({
  topic,
  answerText,
  sources = [],
  images,
  className = "",
  onPlayToggle,
  isPlaying,
  onCopy,
}: StructuredAnswerProps) {
  const { theme } = useTheme();
  // Preprocess streaming text so that partial table lines don't prevent markdown detection.
  const preprocessedAnswer = useMemo(() => {
    if (!answerText) return answerText;
    // If the text contains a header row and separator but lacks a trailing newline after a row being typed, add one temporarily.
    // This helps ReactMarkdown render an in-progress table.
    const lines = answerText.replace(/\r/g, "").split("\n");
    // Detect if we have a table header & separator but the last line is a row without newline termination.
    for (let i = 0; i < lines.length - 1; i++) {
      const header = lines[i];
      const sep = lines[i + 1];
      if (header.includes("|") && /^\s*[-:| ]+$/.test(sep)) {
        // Found a potential table start; ensure subsequent row lines keep pipe structure.
        // If the last line (last non-empty) contains '|' but there is no blank line after, we leave as is.
        // We only need to adjust if separator is last line (incomplete first row) — then add a dummy blank so GFM parser proceeds gracefully.
        if (i + 1 === lines.length - 1) {
          lines.push("");
        }
        break;
      }
    }
    return lines.join("\n");
  }, [answerText]);
  const markdownMode = useMemo(
    () => hasMarkdownStructure(preprocessedAnswer),
    [preprocessedAnswer]
  );
  const sections = useMemo(() => parseSections(answerText), [answerText]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const trackedBlocks = useRef<Array<{ el: HTMLElement; indices: number[] }>>(
    []
  );

  // Attach ref factory for blocks with associated source indices
  const attachTrackedRef = (indices: number[]) => (el: HTMLElement | null) => {
    if (!el) return;
    const exists = trackedBlocks.current.some((r) => r.el === el);
    if (!exists) {
      trackedBlocks.current.push({ el, indices });
      if (observerRef.current) observerRef.current.observe(el);
    }
  };

  const toggleSection = (idx: number) =>
    setCollapsed((prev) => ({ ...prev, [idx]: !prev[idx] }));

  useEffect(() => {
    if (!sourcesOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setSourcesOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourcesOpen]);

  // Initialize IntersectionObserver for scroll-sync source highlighting
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    trackedBlocks.current = [];
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Consider entries that are intersecting and pick the one closest to the top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const top = visible[0];
        const rec = trackedBlocks.current.find((r) => r.el === top.target);
        if (!rec || !rec.indices?.length) return;
        const firstIdx = rec.indices[0];
        if (Number.isInteger(firstIdx)) setActiveSource(firstIdx);
      },
      {
        root: null,
        rootMargin: "0px 0px -65% 0px",
        threshold: [0.25, 0.5, 0.75, 1.0],
      }
    );
    // Observe any already registered elements
    trackedBlocks.current.forEach((r) => observerRef.current?.observe(r.el));
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerText]);

  const heading = markdownMode ? "" : topic || sections[0]?.title || "";
  const overviewBlocks = useMemo(
    () => toBlocks(sections[0]?.content || []),
    [sections]
  );
  const firstOverviewIsParagraph =
    overviewBlocks.length > 0 && overviewBlocks[0]?.type === "p";
  const inlineImages = (images || []).slice(0, 3);

  // Heuristic entity extraction (MVP): if the first heading or topic looks like a proper name, build a Person or Place entity
  const entity: AnyEntity | null = useMemo(() => {
    const title = (topic || sections[0]?.title || "").trim();
    const isProper = /\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(title);
    const isPlace =
      /(city|state|country|district|province|mount|lake|river|university|institute)/i.test(
        answerText
      );
    // Try to pick an image from provided images or a source with an obvious image
    const img = (images && images[0]) || undefined;
    if (!title) return null;
    if (
      isProper &&
      /who\s+is|biography|born|spouse|parents|citizenship/i.test(answerText)
    ) {
      // Extract a few fields from text (very naive; can be replaced with server-provided structured entity later)
      const bornMatch = answerText.match(
        /born\s+on\s+([^,\n]+)|born\s*\(([^)]+)\)/i
      );
      const birthPlace = (answerText.match(/born.*?in\s+([^\.,\n]+)/i) ||
        [])[1];
      const deathMatch = answerText.match(/died\s+on\s+([^,\n]+)/i);
      const spouse = (answerText.match(/spouse[s]?:\s*([^\n]+)/i) || [])[1];
      const parents = (answerText.match(/parent[s]?:\s*([^\n]+)/i) || [])[1];
      const citizenship = (answerText.match(/citizenship:([^\n]+)/i) || [])[1];
      return {
        type: "person",
        name: title,
        fullName: title,
        image: img,
        description: firstOverviewIsParagraph
          ? (overviewBlocks[0] as any)?.text
          : undefined,
        birthDate: bornMatch?.[1] || bornMatch?.[2],
        birthPlace,
        deathDate: deathMatch?.[1],
        spouse,
        parents,
        citizenship,
      } as AnyEntity;
    }
    if (isPlace) {
      const country = (answerText.match(/\bcountry\b[:\-]?\s*([^\n]+)/i) ||
        [])[1];
      const population = (answerText.match(/population[:\-]?\s*([^\n]+)/i) ||
        [])[1];
      return {
        type: "place",
        name: title,
        image: img,
        description: firstOverviewIsParagraph
          ? (overviewBlocks[0] as any)?.text
          : undefined,
        country,
        population,
      } as AnyEntity;
    }
    return null;
  }, [
    topic,
    sections,
    answerText,
    images,
    firstOverviewIsParagraph,
    overviewBlocks,
  ]);

  // Simple slug for markdown headings
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  // Helper function to copy table data to clipboard
  const copyTableData = (headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    navigator?.clipboard
      ?.writeText(csvContent)
      .then(() => {
        // Could add a toast notification here if available
        console.log("Table copied to clipboard as CSV");
      })
      .catch(() => {
        // Fallback: copy as tab-separated values for better compatibility
        const tsvContent = [
          headers.join("\t"),
          ...rows.map((row) => row.join("\t")),
        ].join("\n");
        navigator?.clipboard?.writeText(tsvContent);
      });
  };

  return (
    <div className={`text-left ai-answer-font ${className}`}>
      {/* Developer Note: Markdown table rendering
          The component auto-detects markdown mode using hasMarkdownStructure().
          Tables are rendered via ReactMarkdown + remark-gfm with a custom <MarkdownTable /> wrapper.
          Streaming partial content is preprocessed (preprocessedAnswer) to avoid a missing trailing newline
          preventing GFM from recognizing in-progress tables.

          Sample markdown table for quick manual test (paste into answerText):
          | Feature | Status | Notes |
          |---------|:------:|-------|
          | Table Detection | ✅ | Uses improved regex |
          | Streaming Partial | ✅ | Adds blank line if header+sep at end |
          | Copy Button | ✅ | Copies CSV (fallback TSV) |
      */}
      {entity && (
        <div className="mb-4">
          <EntityCard entity={entity} />
        </div>
      )}
      {heading ? (
        <h2
          className={`title-font text-xl md:text-2xl font-bold mb-3 ${
            theme === "light" ? "text-gray-900" : "text-white"
          }`}
        >
          {heading}
        </h2>
      ) : null}

      {markdownMode ? (
        <div
          className={`prose max-w-none ${
            theme === "light" ? "prose-gray" : "prose-invert"
          }`}
        >
          {Array.isArray(sources) && sources.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <TooltipProvider>
                {sources.slice(0, 10).map((s, i) => {
                  let domain = "";
                  try {
                    domain = new URL(s.url).hostname.replace(/^www\./, "");
                  } catch {}
                  const active = activeSource === i;
                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setActiveSource(i)}
                          onMouseLeave={() => setActiveSource(null)}
                          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs transition shadow-sm backdrop-blur-sm no-underline ${
                            active
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                              : "bg-gray-100/80 border-gray-300/60 text-gray-900 hover:bg-gray-200/60 dark:bg-white/10 dark:border-white/20 dark:text-foreground/80 dark:hover:bg-white/15"
                          }`}
                        >
                          <span
                            className={`inline-flex items-center justify-center rounded-full w-5 h-5 overflow-hidden border shadow-sm ${
                              active
                                ? "bg-indigo-600 border-indigo-500"
                                : "bg-gray-200/80 border-gray-300/60 dark:bg-white/10 dark:border-white/20"
                            }`}
                          >
                            {domain ? (
                              <img
                                src={faviconUrl(domain)}
                                alt={domain}
                                className="w-full h-full object-contain"
                                onError={(e) =>
                                  ((
                                    e.currentTarget as HTMLImageElement
                                  ).style.display = "none")
                                }
                              />
                            ) : (
                              <span className="text-[10px] leading-none">
                                •
                              </span>
                            )}
                          </span>
                          <span className="truncate max-w-[12rem]">
                            {s.title || domain || s.url}
                          </span>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>{s.url}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          )}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, children, ...props }) => {
                const text = String(children ?? "");
                return (
                  <h2
                    id={slugify(text)}
                    className="text-2xl font-bold mt-4 mb-2"
                    {...props}
                  />
                );
              },
              h2: ({ node, children, ...props }) => {
                const text = String(children ?? "");
                return (
                  <h3
                    id={slugify(text)}
                    className="text-xl font-semibold mt-4 mb-2"
                    {...props}
                  />
                );
              },
              h3: ({ node, children, ...props }) => {
                const text = String(children ?? "");
                return (
                  <h4
                    id={slugify(text)}
                    className="text-lg font-semibold mt-3 mb-2"
                    {...props}
                  />
                );
              },
              p: ({ node, children, ...props }) =>
                (() => {
                  const found = new Set<number>();
                  const nodes = renderChildrenWithInlineSRefs(
                    children,
                    sources,
                    activeSource,
                    setActiveSource,
                    (idxs) => idxs.forEach((i) => found.add(i))
                  ) as any;
                  const indices = Array.from(found.values()).sort(
                    (a, b) => a - b
                  );
                  return (
                    <p
                      ref={
                        indices.length ? attachTrackedRef(indices) : undefined
                      }
                      className={`leading-relaxed ${
                        theme === "light" ? "text-gray-800" : "text-white/90"
                      }`}
                      {...props}
                    >
                      {nodes}
                    </p>
                  );
                })(),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-6 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-6 space-y-1" {...props} />
              ),
              li: ({ node, children, ...props }) =>
                (() => {
                  const found = new Set<number>();
                  const nodes = renderChildrenWithInlineSRefs(
                    children,
                    sources,
                    activeSource,
                    setActiveSource,
                    (idxs) => idxs.forEach((i) => found.add(i))
                  ) as any;
                  const indices = Array.from(found.values()).sort(
                    (a, b) => a - b
                  );
                  return (
                    <li
                      ref={
                        indices.length ? attachTrackedRef(indices) : undefined
                      }
                      className="leading-relaxed"
                      {...props}
                    >
                      {nodes}
                    </li>
                  );
                })(),
              table: ({ node, children, ...props }) => (
                <MarkdownTable {...props}>{children}</MarkdownTable>
              ),
              thead: ({ node, ...props }) => (
                <thead
                  className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-white/10 dark:to-white/5"
                  {...props}
                />
              ),
              th: ({ node, ...props }) => (
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white border-b border-gray-200/60 dark:border-white/10 first:rounded-tl-lg last:rounded-tr-lg"
                  {...props}
                />
              ),
              tbody: ({ node, ...props }) => (
                <tbody
                  className="divide-y divide-gray-200/60 dark:divide-white/10"
                  {...props}
                />
              ),
              tr: ({ node, ...props }) => (
                <tr
                  className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150"
                  {...props}
                />
              ),
              td: ({ node, children, ...props }) => {
                const found = new Set<number>();
                const nodes = renderChildrenWithInlineSRefs(
                  children,
                  sources,
                  activeSource,
                  setActiveSource,
                  (idxs) => idxs.forEach((i) => found.add(i))
                ) as any;
                return (
                  <td
                    className="px-4 py-3 align-top text-gray-800 dark:text-white/90 border-b border-gray-200/30 dark:border-white/5 last:border-b-0"
                    {...props}
                  >
                    {nodes}
                  </td>
                );
              },
              a: ({ node, ...props }) => (
                <a
                  className="text-white underline decoration-dotted underline-offset-2 hover:text-purple-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              code: ({ node, className, children, ...props }) => {
                const text = String(children ?? "");
                const isBlock =
                  /\n/.test(text) || /language-/.test(className || "");
                if (!isBlock) {
                  return (
                    <code
                      className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="relative group">
                    <button
                      onClick={() => navigator?.clipboard?.writeText(text)}
                      className="absolute right-2 top-2 z-10 hidden group-hover:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-black/60 text-white border border-white/10"
                    >
                      Copy
                    </button>
                    <pre className="overflow-auto rounded-lg border border-white/10 bg-white/5 p-3">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {preprocessedAnswer}
          </ReactMarkdown>
        </div>
      ) : (
        <>
          {firstOverviewIsParagraph && (
            <p
              className={`text-base md:text-sm leading-relaxed mb-6 ${
                theme === "light" ? "text-gray-700" : "text-white/90"
              }`}
            >
              {sanitizeInline((overviewBlocks[0] as any).text)}
            </p>
          )}

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

          <div className="space-y-8">
            {sections.map((sec, idx) => {
              let blocks = toBlocks(sec.content || []);
              if (
                idx === 0 &&
                firstOverviewIsParagraph &&
                blocks[0]?.type === "p"
              ) {
                blocks = blocks.slice(1);
              }
              const showTitle = idx !== 0 && !!sec.title;
              const titleText =
                sec.title &&
                sec.title.charAt(0).toUpperCase() +
                  sec.title.slice(1).toLowerCase();
              const isCollapsed = !!collapsed[idx];
              return (
                <div
                  key={idx}
                  className={idx === 0 ? "" : "pt-6 border-t border-white/10"}
                >
                  {showTitle && sec.title && (
                    <button
                      onClick={() => toggleSection(idx)}
                      className={`w-full flex items-center justify-between title-font text-left text-base md:text-lg font-semibold mb-3 ${
                        theme === "light" ? "text-gray-800" : "text-white"
                      }`}
                    >
                      <span>{sanitizeInline(titleText || "")}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {isCollapsed ? "Show" : "Hide"}
                      </span>
                    </button>
                  )}
                  {!isCollapsed && (
                    <div className="space-y-4">
                      {blocks.map((b, i) => {
                        if (b.type === "p") {
                          const text = sanitizeInline(b.text);
                          const found = new Set<number>();
                          const nodes = renderParagraphNodes(
                            text,
                            sources,
                            activeSource,
                            setActiveSource,
                            (idxs) => idxs.forEach((x) => found.add(x))
                          );
                          const indices = Array.from(found.values()).sort(
                            (a, b) => a - b
                          );
                          return (
                            <p
                              key={i}
                              ref={
                                indices.length
                                  ? attachTrackedRef(indices)
                                  : undefined
                              }
                              className={`leading-relaxed text-base ${
                                theme === "light"
                                  ? "text-gray-800"
                                  : "text-white/90"
                              }`}
                            >
                              {nodes.map((n, k) =>
                                typeof n === "string" ? (
                                  <span key={k}>{n}</span>
                                ) : (
                                  React.cloneElement(n as any, { key: k })
                                )
                              )}
                            </p>
                          );
                        }
                        if (b.type === "ul")
                          return (
                            <ul key={i} className="list-disc pl-6 space-y-1">
                              {b.items.map((it, j) => (
                                <li key={j}>{sanitizeInline(it)}</li>
                              ))}
                            </ul>
                          );
                        if (b.type === "ol")
                          return (
                            <ol key={i} className="list-decimal pl-6 space-y-1">
                              {b.items.map((it, j) => (
                                <li key={j}>{sanitizeInline(it)}</li>
                              ))}
                            </ol>
                          );
                        if (b.type === "table")
                          return (
                            <div
                              key={i}
                              className="my-6 overflow-x-auto rounded-lg border border-gray-200/50 dark:border-white/20 bg-white/50 dark:bg-white/5 shadow-sm group relative"
                            >
                              <button
                                onClick={() => copyTableData(b.headers, b.rows)}
                                className="absolute top-2 right-2 z-10 hidden group-hover:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-black/60 text-white border border-white/10 hover:bg-black/70 transition-all"
                                title="Copy table as CSV"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    width="14"
                                    height="14"
                                    x="8"
                                    y="8"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                                Copy
                              </button>
                              <Table className="min-w-full">
                                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-white/10 dark:to-white/5">
                                  <TableRow className="border-b border-gray-200/60 dark:border-white/10">
                                    {b.headers.map((h, k) => (
                                      <TableHead
                                        key={k}
                                        className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white first:rounded-tl-lg last:rounded-tr-lg"
                                      >
                                        {sanitizeInline(h)}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-200/60 dark:divide-white/10">
                                  {b.rows.map((row, rIdx) => (
                                    <TableRow
                                      key={rIdx}
                                      className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150"
                                    >
                                      {row.map((cell, cIdx) => {
                                        const text = sanitizeInline(cell);
                                        const found = new Set<number>();
                                        const nodes = renderParagraphNodes(
                                          text,
                                          sources,
                                          activeSource,
                                          setActiveSource,
                                          (idxs) =>
                                            idxs.forEach((x) => found.add(x))
                                        );
                                        const indices = Array.from(
                                          found.values()
                                        ).sort((a, b) => a - b);

                                        return (
                                          <TableCell
                                            key={cIdx}
                                            ref={
                                              indices.length
                                                ? attachTrackedRef(indices)
                                                : undefined
                                            }
                                            className="px-4 py-3 align-top text-gray-800 dark:text-white/90 border-b border-gray-200/30 dark:border-white/5 last:border-b-0"
                                          >
                                            {nodes.map((n, k) =>
                                              typeof n === "string" ? (
                                                <span key={k}>{n}</span>
                                              ) : (
                                                React.cloneElement(n as any, {
                                                  key: k,
                                                })
                                              )
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          );
                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Removed static end-of-answer Sources list per user request */}

      {(onPlayToggle || onCopy) && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {onPlayToggle && (
              <button
                onClick={() => onPlayToggle(answerText)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition bg-black/60 text-white border border-white/10 backdrop-blur-md shadow-lg`}
              >
                {isPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <rect x="6" y="6" width="12" height="12"></rect>
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M5 3v18l15-9z" />
                  </svg>
                )}
                <span className="hidden sm:inline text-white">
                  {isPlaying ? "Stop" : "Play"}
                </span>
              </button>
            )}

            {onCopy && (
              <button
                onClick={() => onCopy(answerText)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-black/60 text-white border border-white/10 backdrop-blur-md shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span className="hidden sm:inline text-white">Copy</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setSourcesOpen(true)}
              className={`px-4 py-2 rounded-full shadow-sm text-sm font-medium hover:opacity-95 transition ${
                theme === "light"
                  ? "bg-gray-100 text-gray-800 border border-gray-200"
                  : "bg-card/80 border border-white/20 text-white"
              }`}
            >
              Sources
            </button>
          </div>
        </div>
      )}

      {sourcesOpen && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center p-6">
          <div
            onClick={() => setSourcesOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-2xl bg-white/6 backdrop-blur-md rounded-lg overflow-hidden shadow-2xl border border-white/10 z-10 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <span
                className={`text-sm font-semibold tracking-wide ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                Sources
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSourcesOpen(false)}
                  className={`text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 ${
                    theme === "light" ? "text-gray-800" : "text-white"
                  }`}
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
                    <div className="flex flex-col items-center w-10 relative flex-shrink-0">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-9 h-9 rounded-md bg-white/60 dark:bg.white/10 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-sm hover:shadow"
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
                      <span className="absolute -bottom-1 right-1 w-6 h-6 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center text-white font-semibold shadow">{`S${
                        i + 1
                      }`}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`text-sm font-normal hover:underline whitespace-normal break-words ${
                          theme === "light" ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {s.title || s.url}
                      </a>
                      {s.snippet && (
                        <p
                          className={`text-sm leading-relaxed ${
                            theme === "light"
                              ? "text-gray-700"
                              : "text-white/80"
                          }`}
                        >
                          {s.snippet}
                        </p>
                      )}
                      <div
                        className={`text-[12px] truncate ${
                          theme === "light" ? "text-gray-600" : "text-white/60"
                        }`}
                      >
                        {domain}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition ease-out text-[10px]">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 ${
                            theme === "light" ? "text-gray-800" : "text-white"
                          }`}
                        >
                          Open
                        </a>
                        <button
                          onClick={() => navigator?.clipboard?.writeText(s.url)}
                          className={`px-2 py-0.5 rounded-full bg-white/10 hover:bg.white/15 border border-white/10 ${
                            theme === "light" ? "text-gray-800" : "text-white"
                          }`}
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>
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
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
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
            <div
              className={`px-4 py-3 text-[11px] border-t border-white/5 flex items-center justify-start ${
                theme === "light" ? "text-gray-600" : "text-white/60"
              }`}
            >
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
