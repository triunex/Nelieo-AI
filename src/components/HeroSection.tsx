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
  const [isFullScreen, setIsFullScreen] = useState(false);
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

          {/* Modern glassy video frame */}
          <motion.div
            className="relative max-w-4xl mx-auto mt-8 mb-12"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            {/* Layered glows for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-[28px] blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-rose-500/10 rounded-[28px] blur-3xl transform rotate-12" />
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-2 overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3),0_0_80px_-12px_rgba(255,140,50,0.2)] will-change-transform">
              <div
                className="group relative aspect-[16/9] w-full rounded-2xl bg-black/40 overflow-hidden cursor-pointer"
                onClick={() => setIsFullScreen(true)}
              >
                {/* Demo video - replace src with your actual demo video */}
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/placeholder.png"
                >
                  <source src="Examples/Demo.mp4" type="video/mp4" />
                </video>

                {/* Hover overlay with See Full Demo button */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm flex items-center justify-center">
                  <button className="transform scale-95 group-hover:scale-100 transition-all duration-300 px-6 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-2 text-white font-medium">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    See Full Demo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

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

      {/* Fullscreen Video Overlay */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setIsFullScreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-[90vw] max-w-7xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
                poster="/placeholder.png"
              >
                <source src="/demo.mp4" type="video/mp4" />
              </video>

              {/* Close button */}
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white/90 hover:text-white transition-all duration-300"
                onClick={() => setIsFullScreen(false)}
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default HeroSection;
