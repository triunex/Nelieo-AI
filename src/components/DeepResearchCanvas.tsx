import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  query: string;
  fullAnswer?: string;
  stages?: Array<any>;
  metrics?: any;
  summary?: string | null;
};

const DeepResearchCanvas: React.FC<Props> = ({
  open,
  onClose,
  query,
  fullAnswer,
}) => {
  const [width, setWidth] = useState<number>(360);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Apply body class and CSS variable for slide distance
  useEffect(() => {
    if (open) {
      document.body.classList.add("canvas-open");
      document.documentElement.style.setProperty(
        "--canvas-width",
        `${width}px`
      );
      // trap focus to the panel
      setTimeout(() => contentRef.current?.focus(), 60);
    } else {
      document.body.classList.remove("canvas-open");
      document.documentElement.style.removeProperty("--canvas-width");
    }

    return () => {
      document.body.classList.remove("canvas-open");
      document.documentElement.style.removeProperty("--canvas-width");
    };
  }, [open, width]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyAnswer = async () => {
    if (!fullAnswer) return;
    try {
      await navigator.clipboard.writeText(String(fullAnswer));
      // optional: show toast via project's notification system
    } catch (e) {
      // ignore
    }
  };

  const downloadAnswer = () => {
    if (!fullAnswer) return;
    const blob = new Blob([String(fullAnswer)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deep-research-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printAnswer = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>Deep Research</title></head><body>${String(
        fullAnswer || ""
      )}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 canvas-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: width + 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: width + 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            role="dialog"
            aria-modal="true"
            style={{ width: `${width}px`, maxWidth: "86vw" }}
            className="fixed right-0 top-0 bottom-0 z-50 bg-background text-foreground border-l border-transparent shadow-none overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-transparent bg-background sticky top-0 z-20">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  Deep Research
                </div>
                <div className="text-sm font-semibold truncate max-w-[32ch]">
                  {query}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-md bg-muted/3 p-1">
                  <button
                    className="px-2 py-1 text-xs rounded hover:bg-muted/6"
                    onClick={() => setWidth(360)}
                    aria-label="Small width"
                  >
                    S
                  </button>
                  <button
                    className="px-2 py-1 text-xs rounded hover:bg-muted/6"
                    onClick={() => setWidth(520)}
                    aria-label="Medium width"
                  >
                    M
                  </button>
                  <button
                    className="px-2 py-1 text-xs rounded hover:bg-muted/6"
                    onClick={() => setWidth(760)}
                    aria-label="Large width"
                  >
                    L
                  </button>
                </div>

                <button
                  onClick={downloadAnswer}
                  className="p-2 rounded-md hover:bg-muted/6"
                  title="Download"
                >
                  Download
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close canvas"
                  className="ml-1 p-2 rounded-md bg-muted/5 hover:bg-muted/6 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              ref={contentRef}
              tabIndex={-1}
              className="h-full overflow-y-auto p-4 text-sm leading-relaxed ai-answer-font custom-scrollbar"
            >
              {fullAnswer ? (
                <div className="prose prose-invert max-w-full">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {String(fullAnswer)}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4">
                  Answer will appear here when ready.
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeepResearchCanvas;
