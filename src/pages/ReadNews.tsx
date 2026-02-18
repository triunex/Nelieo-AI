import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  SendHorizonal,
  MessageCircle,
  Volume2,
  Bookmark,
  Clock,
  Sparkles,
  Home,
  History,
  FileText,
  Mic,
  PlayCircle,
  PauseCircle,
  StopCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const ReadNews = () => {
  const { state } = useLocation();
  const [articleData, setArticleData] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(
    null
  );
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showArticleChat, setShowArticleChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  console.log("location.state", state); // Debug log for location state

  useEffect(() => {
    if (state?.link) {
      console.log("Fetching full article for:", state.link); // Debug log for API request
      setIsLoading(true); // Set loading state to true before fetching
      fetch(
        `https://cognix-api.onrender.com/api/article?url=${encodeURIComponent(
          state.link
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          console.log("Full article data received:", data); // Debug log for API response
          setArticleData(data);
          setIsLoading(false); // Set loading state to false after fetching
        })
        .catch(() => setIsLoading(false)); // Handle errors gracefully
    }
  }, [state?.link]);

  const summarizeArticle = async () => {
    setIsSummarizing(true);
    setSummary("");

    try {
      const res = await fetch(
        "https://cognix-api.onrender.com/api/summarize-article",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: articleData.content }),
        }
      );
      if (!res.ok) {
        // Try fallback endpoint name
        const fallback = await fetch(
          "https://cognix-api.onrender.com/api/summarize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: articleData.content }),
          }
        );
        if (!fallback.ok) throw new Error("Both summarize endpoints failed");
        const fbData = await fallback.json().catch(() => ({}));
        setSummary(
          fbData.summary || fbData.result || "❌ Could not generate summary."
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setSummary(
          data.summary || data.result || "❌ Could not generate summary."
        );
      }
    } catch (e) {
      setSummary("❌ Summarization failed. Please try again.");
    }
    setIsSummarizing(false);
  };

  const speakArticle = () => {
    const speech = window.speechSynthesis;

    // Stop current reading
    speech.cancel();

    const avaVoice = speech
      .getVoices()
      .find(
        (v) =>
          v.name === "Microsoft Ava Online (Natural) - English (United States)"
      );

    const text =
      articleData.title + ". " + articleData.content?.replace(/<[^>]+>/g, "");

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = avaVoice || speech.getVoices()[0];
    utter.lang = "en-US";
    utter.rate = 1;
    utter.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      setUtterance(null);
    };

    speech.speak(utter);
    setUtterance(utter);
    setIsReading(true);
    setIsPaused(false);
  };

  const pauseSpeech = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeech = () => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "__loading__" },
    ]);
    const currentInput = chatInput.trim();
    setChatInput("");
    const prompt = `You are a helpful expert assistant. Provide a structured, clear, modern answer. Avoid markdown symbols like # * **. Use concise heading lines, bullet points (use •), numbered steps (1.), short paragraphs, and horizontal separators where it improves clarity.\n\nARTICLE CONTENT BEGIN\n${articleData.content}\nARTICLE CONTENT END\n\nUser: ${currentInput}`;

    try {
      const res = await fetch(
        "https://cognix-api.onrender.com/api/summarize-article",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: prompt }),
        }
      );
      let data: any = {};
      if (res.ok) data = await res.json().catch(() => ({}));
      else {
        const res2 = await fetch(
          "https://cognix-api.onrender.com/api/summarize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: prompt }),
          }
        );
        if (res2.ok) data = await res2.json().catch(() => ({}));
      }
      const answer = data.summary || data.result || "No answer available.";
      setChatMessages((prev) => {
        const idx = prev.findIndex(
          (m) => m.role === "assistant" && m.content === "__loading__"
        );
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = { role: "assistant", content: answer };
          return clone;
        }
        return [...prev, { role: "assistant", content: answer }];
      });
    } catch (e) {
      setChatMessages((prev) => {
        const idx = prev.findIndex(
          (m) => m.role === "assistant" && m.content === "__loading__"
        );
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = {
            role: "assistant",
            content: "❌ Failed to fetch answer.",
          };
          return clone;
        }
        return [
          ...prev,
          { role: "assistant", content: "❌ Failed to fetch answer." },
        ];
      });
    }
  };

  // Inline structured renderer (local to this file per instructions)
  const StructuredBubble = ({ text }: { text: string }) => {
    const blocks = useMemo(() => {
      if (!text) return [] as any[];
      if (text === "__loading__") return [{ type: "loading" }];
      const cleaned = text.replace(/[\r\t]+/g, "").trim();
      const lines = cleaned
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      const result: any[] = [];
      let currentPara: string[] = [];
      const flushPara = () => {
        if (currentPara.length) {
          result.push({ type: "para", text: currentPara.join(" ") });
          currentPara = [];
        }
      };
      lines.forEach((line) => {
        // heading heuristic: short line < 80 chars, no trailing punctuation, capitalized words
        if (/^(={3,}|-{3,})$/.test(line)) {
          flushPara();
          result.push({ type: "sep" });
          return;
        }
        if (/^\d+\./.test(line)) {
          flushPara();
          const match = line.match(/^(\d+)\.\s*(.*)$/);
          if (match)
            result.push({
              type: "number",
              index: parseInt(match[1], 10),
              text: match[2],
            });
          return;
        }
        if (/^(\*|-|•)\s+/.test(line)) {
          flushPara();
          result.push({
            type: "bullet",
            text: line.replace(/^(\*|-|•)\s+/, ""),
          });
          return;
        }
        const isHeading =
          line.length < 80 &&
          /[A-Za-z]/.test(line) &&
          !/[.:;]$/.test(line) &&
          line
            .split(/\s+/)
            .filter((w) => w)
            .every((w) => /^[A-Z0-9]/.test(w));
        if (isHeading) {
          flushPara();
          result.push({ type: "heading", text: line.replace(/^[#*>\s]+/, "") });
          return;
        }
        if (line.length === 0) {
          flushPara();
        } else {
          currentPara.push(line);
        }
      });
      flushPara();
      // Insert separators between distinct semantic groups (heading -> others)
      const enhanced: any[] = [];
      for (let i = 0; i < result.length; i++) {
        enhanced.push(result[i]);
        if (i < result.length - 1) {
          const a = result[i];
          const b = result[i + 1];
          if (a.type === "para" && b.type === "heading")
            enhanced.push({ type: "sep-soft" });
        }
      }
      return enhanced;
    }, [text]);

    return (
      <div className="space-y-3">
        {blocks.map((b, i) => {
          if (b.type === "loading") {
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                Thinking...
              </div>
            );
          }
          if (b.type === "heading") {
            return (
              <div
                key={i}
                className="text-sm font-semibold tracking-wide relative pl-3 py-1 rounded-md bg-gradient-to-r from-purple-500/10 to-transparent text-purple-300"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l" />
                {b.text}
              </div>
            );
          }
          if (b.type === "bullet") {
            return (
              <div
                key={i}
                className="flex items-start gap-2 text-xs sm:text-sm"
              >
                <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow" />
                <span className="text-muted-foreground leading-relaxed">
                  {b.text}
                </span>
              </div>
            );
          }
          if (b.type === "number") {
            return (
              <div
                key={i}
                className="flex items-start gap-3 text-xs sm:text-sm"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold text-purple-300 shadow-inner">
                  {b.index}
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  {b.text}
                </span>
              </div>
            );
          }
          if (b.type === "sep") {
            return (
              <div
                key={i}
                className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
              />
            );
          }
          if (b.type === "sep-soft") {
            return (
              <div
                key={i}
                className="h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent"
              />
            );
          }
          if (b.type === "para") {
            return (
              <p
                key={i}
                className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-light"
              >
                {b.text}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log("Loaded voices:", window.speechSynthesis.getVoices());
      };
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated gradient background */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-spin-slow">
            <div className="absolute inset-0 m-1 rounded-full bg-background"></div>
          </div>

          {/* Loading text */}
          <p className="text-lg font-semibold text-gray-300 animate-pulse">
            Loading full article...
          </p>
        </div>

        {/* Custom CSS for slow spin animation */}
        <style>{`
        @keyframes spin-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
      </div>
    );
  }

  if (!articleData || !articleData.content) {
    return (
      <div className="text-foreground text-center mt-10 text-lg">
        ⚠️ Could not extract full article.
        <p className="mt-4 text-muted-foreground">{state.snippet}</p>
        <a
          href={state.link}
          target="_blank"
          className="underline text-purple-500 block mt-4"
        >
          🔗 Open Original
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 bg-background text-foreground">
      {/* Theme toggle top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Animated Logo at the top left, absolute positioning */}
      <div className="absolute top-6 left-4 sm:left-6 z-20">
        <a href="/" className="inline-block">
          <motion.img
            src="/favicon.png"
            alt="Logo"
            style={{ height: 59 }}
            initial={{ scale: 1, rotate: 0, opacity: 1 }}
            whileHover={{
              scale: [1, 1.15, 1],
              rotate: [0, 360, 0],
              transition: {
                duration: 1.2,
                ease: "easeInOut",
                repeat: 0,
              },
            }}
          />
        </a>
      </div>
      <div className="max-w-3xl mx-auto">
        <Link
          to="/news"
          className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block sm:text-base"
        >
          ← Back to News
        </Link>

        {articleData?.lead_image_url ? (
          <img
            src={articleData.lead_image_url}
            alt="Cover"
            className="w-full h-64 object-cover rounded-xl shadow-md mb-6"
          />
        ) : (
          <div className="w-full h-64 rounded-xl shadow-md mb-6 bg-muted flex items-center justify-center text-muted-foreground text-sm italic">
            🖼️ No image available
          </div>
        )}

        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "Gamilia, serif" }}
        >
          {articleData?.title}
        </h1>

        <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-4">
          {!isReading ? (
            <button
              onClick={speakArticle}
              className="bg-primary/10 hover:bg-primary/20 text-foreground px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PlayCircle className="w-6 h-6" /> Read Out Loud
              {isReading && (
                <span className="ml-2 relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
                </span>
              )}
            </button>
          ) : isPaused ? (
            <button
              onClick={resumeSpeech}
              className="bg-primary/10 hover:bg-primary/20 text-foreground px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Volume2 className="w-6 h-6" /> Resume
            </button>
          ) : (
            <button
              onClick={pauseSpeech}
              className="bg-primary/10 hover:bg-primary/20 text-foreground px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PauseCircle className="w-6 h-6" /> Pause
            </button>
          )}

          {isReading && (
            <button
              onClick={stopSpeech}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg"
            >
              <StopCircle className="w-6 h-6 text-white hover:text-purple-400" />{" "}
              Stop
            </button>
          )}

          <button
            onClick={summarizeArticle}
            className={`${
              isSummarizing ? "bg-muted" : "bg-primary hover:bg-primary/90"
            } text-primary-foreground px-4 py-2 rounded-lg transition flex items-center gap-2`}
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Summarize</span>
              </>
            )}
          </button>
        </div>

        {isSummarizing && (
          <div className="mt-6 p-4 bg-card border border-border rounded-xl text-sm animate-pulse">
            🧠 Generating smart summary...
          </div>
        )}

        {summary && !isSummarizing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mt-6 p-4 bg-card border border-border rounded-xl text-sm sm:text-base"
          >
            {/* ❌ Close Button */}
            <button
              onClick={() => setSummary("")}
              className="absolute top-3 right-3 z-10 p-1 rounded-full bg-muted hover:bg-muted/80 transition"
              title="Close Summary"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-white font-semibold mb-2"></h3>

            {/* 🔊 Add TTS Button */}
            <button
              onClick={() => {
                const utter = new SpeechSynthesisUtterance(
                  summary.replace(/[*#]/g, "") // Clean voice output
                );
                utter.lang = "en-US";
                utter.voice =
                  speechSynthesis
                    .getVoices()
                    .find(
                      (v) =>
                        v.name ===
                        "Microsoft Ava Online (Natural) - English (United States)"
                    ) || speechSynthesis.getVoices()[0];

                speechSynthesis.cancel(); // Stop old voice
                speechSynthesis.speak(utter);
              }}
              className="mb-3 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-foreground text-sm transition"
            >
              <Volume2 className="w-5 h-5" /> Read Summary
            </button>

            <p className="text-muted-foreground whitespace-pre-line text-sm sm:text-base">
              {summary.replace(/[*#]/g, "")}
            </p>
          </motion.div>
        )}

        {articleData?.content ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-sm sm:text-base leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: articleData.content }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Full content unavailable. You can view the original:{" "}
            <a
              href={state.link}
              className="text-purple-500 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              click here
            </a>
          </p>
        )}

        {/* Chat Button at the Bottom */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowArticleChat(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition"
          >
            <MessageCircle className="w-5 h-5" />
            Chat About This Article
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {showArticleChat && (
        <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-6 w-[92vw] sm:w-[440px] h-[72vh] sm:h-[520px] text-foreground z-50 animate-fade-in">
          <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-purple-500/20 backdrop-blur-xl bg-gradient-to-br from-[#1c1028]/90 via-[#0f1017]/85 to-[#101a24]/90">
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(circle at 20% 30%, rgba(168,85,247,0.35), transparent 60%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.25), transparent 55%)",
              }}
            />
            <button
              onClick={() => setShowArticleChat(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/5 hover:bg-white/10 text-purple-200 hover:text-pink-200 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute left-4 top-4 text-xs uppercase tracking-wider font-semibold text-purple-300/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-green-500/50 shadow" />
              Article Chat
            </div>
            <div className="h-full flex flex-col pt-10 pb-4 px-5">
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-xs sm:text-sm text-muted-foreground/70 italic mt-4">
                    Ask contextual questions about the article. Try: <br />
                    <span className="text-purple-300/80">
                      "Give 5 key insights"
                    </span>
                    ,{" "}
                    <span className="text-purple-300/80">
                      "List stakeholders impacted"
                    </span>
                    ,{" "}
                    <span className="text-purple-300/80">
                      "Provide a concise risk summary"
                    </span>
                  </div>
                )}
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`group relative ${isUser ? "ml-8" : "mr-4"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-lg/30 shadow-inner backdrop-blur-md ring-1 ${
                          isUser
                            ? "bg-gradient-to-br from-purple-600/30 via-purple-500/20 to-fuchsia-500/20 ring-purple-500/40 text-purple-50"
                            : "bg-white/5 ring-white/10 text-foreground/90"
                        }`}
                      >
                        {isUser ? (
                          <p className="font-medium text-[11px] uppercase tracking-wider mb-1 text-purple-200/90">
                            You
                          </p>
                        ) : (
                          <p className="font-medium text-[11px] uppercase tracking-wider mb-1 text-pink-200/80">
                            CogniX
                          </p>
                        )}
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words font-light">
                            {msg.content}
                          </p>
                        ) : (
                          <StructuredBubble text={msg.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder="Ask something..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 focus:bg-white/10 transition text-foreground text-xs sm:text-sm placeholder:text-foreground/40 focus:outline-none border border-white/10 focus:border-purple-400/40"
                  />
                  <button
                    onClick={handleChatSubmit}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium shadow-lg shadow-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!chatInput.trim()}
                    title="Send"
                  >
                    <SendHorizonal className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "Key points",
                    "Pros & cons",
                    "Action steps",
                    "Risks",
                    "Explain like I'm 12",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setChatInput(q);
                        setTimeout(() => handleChatSubmit(), 50);
                      }}
                      className="text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-foreground/70 hover:text-foreground border border-white/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(168,85,247,0.4), rgba(236,72,153,0.35)); border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(168,85,247,0.55), rgba(236,72,153,0.5)); }
            @keyframes fadeInScale { 0% { opacity:0; transform: translateY(8px) scale(.98);} 100% { opacity:1; transform: translateY(0) scale(1);} }
            .animate-fade-in { animation: fadeInScale .5s ease; }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ReadNews;
