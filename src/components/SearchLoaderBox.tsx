import { useEffect, useState } from "react";

const searchSteps = [
  "🧠 Analyzing your query...",
  "🌐 Searching across the web...",
  "🔍 Scraping real-time data...",
  "🧩 Structuring your results...",
  "✅ Ready to deliver answer...",
];

export default function SearchLoaderBox({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < searchSteps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-20 right-6 z-50 bg-background/90 backdrop-blur-lg shadow-lg p-4 rounded-xl border border-muted w-[300px] animate-fade-in transition-all">
      <div className="text-sm font-medium text-muted-foreground">
        {searchSteps[stepIndex]}
      </div>
      <button className="text-xs text-primary underline mt-2" onClick={onClose}>
        Hide progress
      </button>
    </div>
  );
}
