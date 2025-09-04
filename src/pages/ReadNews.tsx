import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const [chatMessages, setChatMessages] = useState([]);
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

    const res = await fetch(
      "https://cognix-api.onrender.com/api/summarize-article",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: articleData.content }),
      }
    );

    const data = await res.json();
    setSummary(data.summary || "❌ Could not generate summary.");
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
    const updatedMessages = [
      ...chatMessages,
      { role: "user", content: chatInput },
    ];
    setChatMessages(updatedMessages);
    setChatInput("");

    const prompt = `You're an expert assistant. Discuss this article:\n\n${articleData.content}\n\nUser says: ${chatInput}`;

    const res = await fetch(
      "https://cognix-api.onrender.com/api/summarize-article",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: prompt }),
      }
    );

    const data = await res.json();
    setChatMessages([
      ...updatedMessages,
      { role: "assistant", content: data.summary },
    ]);
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
        <div className="fixed bottom-4 sm:bottom-10 right-4 sm:right-6 w-[90vw] sm:w-[400px] h-[70vh] sm:h-[480px] bg-card backdrop-blur-lg border border-border shadow-xl text-foreground rounded-3xl z-50 glowing-chat p-4 overflow-hidden animate-fade-in">
          <button
            onClick={() => setShowArticleChat(false)}
            className="absolute top-2 right-2 hover:text-red-500 text-xl"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="h-full flex flex-col justify-between pt-6">
            <div className="overflow-y-auto space-y-3 pr-2 max-h-[55vh]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm ${
                    msg.role === "user" ? "text-blue-500" : "text-green-600"
                  }`}
                >
                  <strong>{msg.role === "user" ? "You" : "CogniX"}:</strong>{" "}
                  {msg.content}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground border border-border"
              />
              <button
                onClick={handleChatSubmit}
                className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition"
              >
                <SendHorizonal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadNews;
