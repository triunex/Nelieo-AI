import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchIcon,
  MessageCircle,
  MessageSquare,
  FileText,
  Link,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TypingAnimation from "./TypingAnimation";
import StructuredAnswer from "./StructuredAnswer";
import { toast } from "@/hooks/use-toast";
import { performSearch } from "../services/searchService";
import { SearchSource } from "../services/searchService";
import { Link as RouterLink } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

type SearchMode = "search" | "chat" | "agentic";

const HeroSection = () => {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<SearchMode>("search");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentSources, setCurrentSources] = useState<SearchSource[]>([]);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Animated search status & source ticker (from provided snippet) ---
  const statuses = [
    "Thinking...",
    "Searching sources...",
    "Analyzing results...",
    "Compiling answer...",
  ];
  // Placeholder sources used only until we have real ones
  const placeholderSources = [
    {
      name: "Google",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    },
    {
      name: "Wikipedia",
      logo: "https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png",
    },
    {
      name: "Reddit",
      logo: "https://upload.wikimedia.org/wikipedia/en/5/58/Reddit_logo_new.svg",
    },
    {
      name: "Stack Overflow",
      logo: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Stack_Overflow_icon.svg",
    },
  ];

  const [statusIndex, setStatusIndex] = useState(0);
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(
      () => setStatusIndex((prev) => (prev + 1) % statuses.length),
      1000
    );
    return () => clearInterval(interval);
  }, [isSearching]);

  // Build favicon-ready sources from current search results
  const displaySources = (
    currentSources?.length
      ? currentSources.map((s) => {
          try {
            const u = new URL(s.url);
            const domain = u.hostname;
            return { name: domain.replace(/^www\./, ""), domain };
          } catch {
            return { name: s.title || "Source" } as {
              name: string;
              domain?: string;
            };
          }
        })
      : null
  ) as Array<{ name: string; domain?: string }> | null;

  // Local favicon loader with graceful fallbacks
  const FaviconImg: React.FC<{ domain?: string; alt: string }> = ({
    domain,
    alt,
  }) => {
    const [idx, setIdx] = useState(0);
    const candidates = domain
      ? [
          `https://icons.duckduckgo.com/ip3/${domain}.ico`,
          `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`,
          `https://${domain}/favicon.ico`,
        ]
      : [];
    const src = candidates[idx];
    if (!src)
      return (
        <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-blue-500" />
      );
    return (
      <img
        src={src}
        alt={alt}
        className="w-6 h-6 object-contain rounded"
        onError={() => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i))}
      />
    );
  };

  // Sample questions for suggestion chips
  const sampleQuestions = [
    "Latest AI advancements",
    "Climate change solutions",
    "Space exploration news",
    "Quantum computing explained",
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsSearching(true);
    setShowAnswer(false);
    setIsAnimating(false);
    setShowFullAnswer(false);
    setError(null);

    // Show searching toast
    toast({
      title: "Searching the web",
      description: "Finding the most relevant sources...",
    });

    try {
      // Perform the actual search using Supabase edge function
      const result = await performSearch(query, mode);

      setCurrentAnswer(result.answer);
      setCurrentSources(result.sources);
      if (Array.isArray(result.images)) {
        setCurrentImages(result.images as string[]);
      } else {
        setCurrentImages([]);
      }

      // Keep loader visible briefly so dynamic favicons can show
      const HANDOFF_MS = 650;
      setTimeout(() => {
        setIsSearching(false);
        setShowAnswer(true);
        setIsAnimating(true);
      }, HANDOFF_MS);

      // Show completion toast
      toast({
        title: "Results ready",
        description: `Found ${result.sources.length} sources for your query`,
      });
    } catch (err) {
      setIsSearching(false);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );

      toast({
        title: "Search failed",
        description:
          err instanceof Error ? err.message : "Failed to complete your search",
        variant: "destructive",
      });
    }
  };

  // Live structured typing: hold partial text while typing
  const [livePartial, setLivePartial] = useState<string>("");
  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setShowFullAnswer(true);
    setLivePartial("");
  };

  const handleAskFollowup = () => {
    // Append the current query to help with context
    setQuery(`Regarding "${query}", I'd like to know more about `);
    // Focus on the input
    document.querySelector("input")?.focus();
  };

  // Simple sanitizer for non-agentic plain text
  const sanitizePlain = (s: string) =>
    s
      .replace(/\*\*|__|`|~~|\*|^#{1,6}\s|^>\s|^\s*-\s/gm, "")
      .replace(/\s{3,}/g, " ");

  return (
    <motion.section
      className="pt-24 pb-12 md:pt-32 md:pb-20 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-hero-glow"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            initial={{ y: 6, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Search smarter. Chat deeper. Work faster. With{" "}
            <span className="ai-powered-gradient">Nelieo</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-gray-300 mb-8 opacity-90"
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            Get instant answers, stunning visuals, smart voice, and a full AI OS
            faster than search, smarter than chat, beyond anything you’ve used
            before.
          </motion.p>

          <motion.div
            className="mb-4 flex justify-center"
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value: SearchMode) => value && setMode(value)}
              className="bg-white/5 backdrop-blur-sm rounded-full p-1"
            >
              <ToggleGroupItem
                value="search"
                aria-label="Search mode"
                className="rounded-full flex items-center gap-1 px-4"
              >
                <SearchIcon size={16} />
                <span>Search</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="chat"
                aria-label="Chat mode"
                className="rounded-full flex items-center gap-1 px-4"
              >
                <MessageCircle size={16} />
                <span>Chat</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="agentic"
                aria-label="Agentic mode"
                className="rounded-full flex items-center gap-1 px-4"
              >
                <MessageSquare size={16} />
                <span>Agentic</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </motion.div>

          <motion.form
            onSubmit={handleSearch}
            className="relative mb-6"
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.18 }}
          >
            <div className="relative max-w-2xl mx-auto">
              <Input
                type="text"
                placeholder={
                  mode === "search"
                    ? "Ask anything... Try 'What are the latest AI advancements?'"
                    : mode === "chat"
                    ? "Chat with AI... Try 'Tell me about climate change'"
                    : "Use AI agent... Try 'Research and summarize space exploration'"
                }
                className="h-14 pl-12 pr-32 rounded-full bg-white/5 backdrop-blur-md border border-white/10 search-glow placeholder:text-gray-500 text-base"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <SearchIcon
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 rounded-full"
                disabled={isSearching}
              >
                {isSearching
                  ? "Searching..."
                  : mode === "search"
                  ? "Search"
                  : mode === "chat"
                  ? "Chat"
                  : "Go"}
              </Button>
            </div>
          </motion.form>

          {/* Perplexity-style, boxless loader with shimmer, reflection, and edge-faded ticker */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                className="relative mt-8 max-w-2xl mx-auto w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {/* Ambient gradient glow (no container box) */}
                <div className="pointer-events-none absolute -inset-x-24 -top-10 h-24 -z-10 blur-3xl opacity-40 bg-gradient-to-r from-purple-500/35 via-blue-500/25 to-pink-500/35" />

                {/* Thin shimmer progress line */}
                <div className="relative h-[2px] overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-current to-transparent"
                    style={{ color: theme === "light" ? "#6b7280" : "#d1d5db" }}
                    animate={{ x: ["-30%", "120%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.6,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                {/* Neural bars */}
                <div className="mt-5 flex items-end justify-center gap-2 h-10">
                  {[...Array(9)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 rounded-full bg-gradient-to-b from-fuchsia-500 to-indigo-500"
                      animate={{ height: [8, 42, 10], opacity: [0.6, 1, 0.75] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.05,
                        delay: i * 0.07,
                        ease: "easeInOut",
                      }}
                      style={{ filter: "saturate(115%)" }}
                    />
                  ))}
                </div>

                {/* Status with mirror/reflection */}
                <div className="mt-4 text-center select-none">
                  <motion.div
                    key={statusIndex}
                    className={
                      theme === "light"
                        ? "text-sm text-gray-700"
                        : "text-sm text-gray-200"
                    }
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className="font-medium tracking-wide">
                      {statuses[statusIndex]}
                    </span>
                  </motion.div>
                  <div
                    aria-hidden="true"
                    className="mx-auto mt-1"
                    style={{
                      width: "fit-content",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))",
                      maskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))",
                    }}
                  >
                    <div
                      className={
                        (theme === "light"
                          ? "text-gray-700"
                          : "text-gray-200") +
                        " text-sm transform scale-y-[-1] opacity-30"
                      }
                    >
                      {statuses[statusIndex]}
                    </div>
                  </div>
                </div>

                {/* Source ticker with edge fade masks */}
                <div className="relative mt-4">
                  {/* Edge fades */}
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
                    style={{
                      background:
                        theme === "light"
                          ? "linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0))"
                          : "linear-gradient(90deg, rgba(2,6,23,1), rgba(2,6,23,0))",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
                    style={{
                      background:
                        theme === "light"
                          ? "linear-gradient(270deg, rgba(255,255,255,1), rgba(255,255,255,0))"
                          : "linear-gradient(270deg, rgba(2,6,23,1), rgba(2,6,23,0))",
                    }}
                  />
                  <div className="overflow-hidden">
                    <motion.div
                      className="flex items-center gap-4 will-change-transform"
                      animate={{ x: ["0%", "-100%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 12,
                        ease: "linear",
                      }}
                    >
                      {[
                        ...(displaySources && displaySources.length
                          ? displaySources
                          : placeholderSources
                        ).map((s: any) => ({
                          name: s.name,
                          domain: s.domain,
                          logo: s.logo,
                        })),
                        ...(displaySources && displaySources.length
                          ? displaySources
                          : placeholderSources
                        ).map((s: any) => ({
                          name: s.name,
                          domain: s.domain,
                          logo: s.logo,
                        })),
                      ].map((src, idx) => (
                        <div
                          key={idx}
                          className={
                            (theme === "light"
                              ? "bg-white border border-gray-200 text-gray-700"
                              : "bg-white/5 border border-white/10 text-gray-200") +
                            " min-w-fit inline-flex items-center gap-2 px-2.5 py-1 rounded-full"
                          }
                        >
                          {src.domain ? (
                            <FaviconImg domain={src.domain} alt={src.name} />
                          ) : (
                            <img
                              src={src.logo}
                              alt={src.name}
                              className="w-5 h-5 object-contain rounded"
                            />
                          )}
                          <span className="text-xs opacity-90">{src.name}</span>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {error && (
            <div className="bg-red-900/20 backdrop-blur-sm rounded-lg p-4 border border-red-500/30 mt-4 mb-6 max-w-3xl mx-auto text-left">
              <p className="text-red-300">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-500/50 text-red-300 hover:bg-red-900/30"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Search results section */}
          {showAnswer && (
            <div
              className={
                `rounded-lg p-6 mt-8 mb-6 max-w-3xl mx-auto text-left animate-fade-in backdrop-blur-sm ` +
                (theme === "light"
                  ? "bg-white border border-gray-200 text-foreground shadow-md"
                  : "bg-white/10 border border-white/10 text-foreground")
              }
            >
              <div className="prose max-w-none dark:prose-invert">
                {isAnimating ? (
                  <>
                    {/* Live structured rendering while typing */}
                    <StructuredAnswer
                      answerText={livePartial || ""}
                      sources={currentSources}
                      images={currentImages}
                    />
                    <TypingAnimation
                      text={currentAnswer}
                      speed={6}
                      onUpdate={(t) => setLivePartial(t)}
                      onComplete={handleAnimationComplete}
                      className="sr-only" /* hide raw text cursor */
                      typingDelay={150}
                    />
                  </>
                ) : showFullAnswer ? (
                  mode === "agentic" ? (
                    <StructuredAnswer
                      answerText={currentAnswer}
                      sources={currentSources}
                      images={currentImages}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {sanitizePlain(currentAnswer)}
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse flex space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    </div>
                  </div>
                )}

                {showFullAnswer && currentSources.length > 0 && (
                  <>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <div className="text-sm text-gray-400 font-semibold mb-2">
                        Sources:
                      </div>
                      <div className="space-y-2">
                        {currentSources.map((source, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-xs bg-white/10 rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 mt-0.5">
                              {index + 1}
                            </span>
                            <div>
                              <a
                                href={source.url}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1.5"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Link size={14} />
                                {source.title}
                              </a>
                              {source.snippet && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {source.snippet}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <FileText size={16} />
                        <span>Sources</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={handleAskFollowup}
                      >
                        <MessageCircle size={16} />
                        <span>Ask follow-up</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <FileText size={16} />
                        <span>Cite this</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div
            className="text-sm text-gray-400 flex flex-col md:flex-row items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <p>Try questions like:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sampleQuestions.map((question, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/5 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => setQuery(question)}
                >
                  {question}
                </span>
              ))}
            </div>
          </div>

          {/* Add a prominent "Get Started" button at the end */}
          <div
            className="mt-8 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            <RouterLink to="/auth">
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-all duration-300 px-8 py-6 text-lg font-medium"
                size="lg"
              >
                Get Started Now
              </Button>
            </RouterLink>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroSection;
