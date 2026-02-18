import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, useLocation, Link } from "react-router-dom"; // Add Outlet and useLocation
import { useAuth } from "@/hooks/useAuth";
import {
  Search as SearchIcon,
  User,
  Settings,
  Eye,
  Info,
  Shield,
  FileText as FileTextIcon,
  LogOut,
  Home,
  Mic,
  Headphones,
  Sparkles,
  Play,
  Lightbulb,
  Newspaper,
  Copy,
  AudioLines,
  Plus,
  Compass,
  PanelRightOpen,
  Monitor,
  Sun,
  Moon,
  Crown,
  MoreVertical,
  MoreHorizontal,
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Bot,
  Focus,
  Pin,
  FileText,
  MessageCircle,
  X,
  Edit,
  Trash,
  Check,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { performSearch, fetchSearchResults } from "@/services/searchService";
import { toast } from "@/hooks/use-toast";
import AIModelSelector from "@/components/AIModelSelector";
import VoiceSearchBar from "@/components/VoiceSearchBar";
// Removed AnswerRenderer in favor of live StructuredAnswer streaming
import TypingAnimation from "@/components/TypingAnimation";
import StructuredAnswer from "@/components/StructuredAnswer";
import type { SearchSource } from "@/services/searchService";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Theme toggle removed per new UI spec
// import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

const BrandedTooltip = ({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="rounded-lg bg-black/90 text-white px-2 py-1 text-xs font-medium shadow-lg animate-in fade-in zoom-in-95 border border-purple-700 max-w-xs"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Search = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // Per-category results fetched in parallel
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [videoResults, setVideoResults] = useState<any[]>([]);
  const [shortVideoResults, setShortVideoResults] = useState<any[]>([]);
  const [newsResults, setNewsResults] = useState<any[]>([]);
  const [shoppingResults, setShoppingResults] = useState<any[]>([]);
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAnswerAnimating, setIsAnswerAnimating] = useState(false);
  const [typingStop, setTypingStop] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    "Gemini 1.5 Flash" | "gpt-3.5" | "gpt-4.1" | "gpt-4o"
  >("Gemini 1.5 Flash");
  const [searchMode, setSearchMode] = useState<"search" | "chat" | "agentic">(
    "search"
  );
  // sidebar removed in this layout
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-US");
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [livePartial, setLivePartial] = useState("");
  const [statusIndex, setStatusIndex] = useState(0);
  // Conversation mode: after first query, dock input to bottom and show chat-style bubbles
  const [conversationMode, setConversationMode] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user"; text: string }>
  >([]);

  // Result category toggle (All / Images / Videos / Shopping / News / Short videos)
  const resultTabs = [
    "Answer",
    "Images",
    "Videos",
    "Shopping",
    "News",
    "Short videos",
  ];
  const [resultTab, setResultTab] = useState<string>("Answer");
  // Map UI tabs to Serp engine query names
  const tabToEngine: Record<string, string | undefined> = {
    Answer: undefined,
    Images: "google_images",
    Videos: "google_videos",
    Shopping: "google_shopping",
    News: "google_news",
    "Short videos": "google_short_videos",
  };

  const location = useLocation(); // Get the current location

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  // Search history
  const [searchHistory, setSearchHistory] = useState<
    Array<{
      id: string;
      query: string;
      mode: "search" | "chat" | "agentic";
      timestamp: number;
      model?: "gpt-3.5" | "gpt-4.1" | "gpt-4o";
      docId?: string; // firestore doc id when persisted
      answer?: string; // cached AI answer
      sources?: SearchSource[]; // cached sources
    }>
  >([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Profile panel state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  // Top buttons visibility (hide when user scrolls to answers)
  const [showTopButtons, setShowTopButtons] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Close panel on outside click / escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!profileOpen) return;
      const t = e.target as Node;
      if (
        profilePanelRef.current &&
        !profilePanelRef.current.contains(t) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(t)
      ) {
        setProfileOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    // Load search history from local storage
    const savedHistory = localStorage.getItem("search_history");
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          id: item.id ?? crypto.randomUUID(),
        }));
        setSearchHistory(parsedHistory);
      } catch (error) {
        console.error("Failed to parse search history:", error);
      }
    }
  }, []);

  // Load persisted history from Firestore for authenticated users
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!auth.currentUser?.uid) return;
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, "users", auth.currentUser.uid, "searchHistory"),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items: any[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: data.id ?? d.id,
            docId: d.id,
            query: data.query,
            mode: data.mode,
            timestamp: data.timestamp,
            model: data.model,
            answer: data.answer,
            sources: data.sources,
          });
        });
        if (items.length) {
          setSearchHistory(items);
          try {
            localStorage.setItem("search_history", JSON.stringify(items));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load Firestore history", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [auth.currentUser?.uid]);

  // Rotate status while loading
  const statuses = [
    "Thinking...",
    "Searching sources...",
    "Analyzing results...",
    "Compiling answer...",
  ];
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(
      () => setStatusIndex((p) => (p + 1) % statuses.length),
      1000
    );
    return () => clearInterval(id);
  }, [loading]);

  // Build favicon-ready sources from current search results
  const displaySources = (
    sources?.length
      ? sources.map((s) => {
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

  // Personalized suggestions
  const personalizedSuggestions = [
    "What are the latest developments in technology?",
    "How does science impact the future of work?",
    "Compare different approaches to artificial intelligence",
    "What are the ethical considerations of technology?",
  ];

  const formatAnswerText = (text: string): string => {
    return text
      .replace(/\n{3,}/g, "\n\n") // Normalize too many newlines
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2") // Add paragraph spacing
      .replace(/^(?!#)(.*?:)/gm, "**$1**") // Remove “according to” lines
      .replace(/source[s]?:/gi, "") // Remove “sources:” labels
      .replace(/\s{2,}/g, " ") // Remove extra spaces
      .trim();
  };

  // Sanitize answers coming from backend: remove spurious "Result — ..." prefixed lines
  // and collapse duplicated consecutive lines. Returns null if nothing remains.
  const sanitizeAnswer = (text: string | null): string | null => {
    if (!text) return text;
    try {
      // Normalize newlines and split
      const rawLines = String(text)
        .split(/\r?\n/)
        .map((l) => l.trim());

      // Filter out lines that look like: "Result — ..." (various dash chars)
      const filtered = rawLines.filter(
        (l) => !/^Result\s*[-—–\u2014]/i.test(l) && l.length > 0
      );

      // Collapse consecutive identical lines
      const deduped: string[] = [];
      for (const l of filtered) {
        if (deduped.length === 0 || deduped[deduped.length - 1] !== l) {
          deduped.push(l);
        }
      }

      const out = deduped.join("\n\n").trim();
      return out === "" ? null : out;
    } catch (err) {
      return text;
    }
  };

  // Hide top buttons when the answer area is in view (or when scrolled down)
  useEffect(() => {
    const container = scrollContainerRef.current || window;
    let observer: IntersectionObserver | null = null;

    const answerEl = document.querySelector(".answer-root");
    if (answerEl && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // when answer is at least 20% visible, hide top buttons
            setShowTopButtons(
              !entry.isIntersecting && document.documentElement.scrollTop < 1000
                ? true
                : !entry.isIntersecting
            );
            // if answer is intersecting (visible), hide buttons
            if (entry.isIntersecting) setShowTopButtons(false);
            else setShowTopButtons(true);
          });
        },
        { root: null, threshold: [0, 0.2, 0.5] }
      );
      observer.observe(answerEl);
    } else {
      // Fallback: attach scroll listener
      const onScroll = () => {
        const el = document.querySelector(".answer-root") as HTMLElement | null;
        if (!el) {
          setShowTopButtons(true);
          return;
        }
        const rect = el.getBoundingClientRect();
        // If top of answer is above the fold (scrolled into view), hide buttons
        const inView = rect.top < window.innerHeight * 0.75 && rect.bottom > 0;
        setShowTopButtons(!inView);
      };
      container.addEventListener("scroll", onScroll, { passive: true });
      // initial check
      onScroll();
      return () => container.removeEventListener("scroll", onScroll as any);
    }

    return () => {
      if (observer && document.querySelector(".answer-root")) {
        observer.disconnect();
      }
    };
  }, [answer]);

  const handleSearch = async (userQuery: string) => {
    const queryString = userQuery || searchTerm;
    setLastQuery(queryString); // Save the actual query used
    if (!queryString) {
      toast({
        title: "Error",
        description: "Please enter a search term.",
        variant: "destructive",
      });
      return;
    }

    if (queryString.includes("http") || queryString.includes("www.")) {
      try {
        const res = await fetch(
          "https://cognix-api.onrender.com/api/browser-agent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: queryString.match(/https?:\/\/[^\s]+/)[0],
            }),
          }
        );

        const data = await res.json();
        setAnswer(
          sanitizeAnswer(data.summary || "Failed to summarize the webpage.")
        );
        return;
      } catch (err) {
        console.error("❌ Browser agent error:", err);
        setAnswer(
          sanitizeAnswer("Something went wrong while processing the URL.")
        );
        return;
      }
    }

    setLoading(true);
    setAnswer(null);
    setLivePartial("");
    // Reset per-category results for a clean slate
    setImageResults([]);
    setVideoResults([]);
    setShortVideoResults([]);
    setNewsResults([]);
    setShoppingResults([]);

    try {
      console.log("Performing search for:", queryString);

      // Run agentic pipeline on Search page even when UI tab is 'search'
      const effectiveMode = searchMode === "search" ? "agentic" : searchMode;
      const result = await performSearch(queryString, effectiveMode);
      console.log("Search result data", result);

      if (!result || !result.answer || !Array.isArray(result.results)) {
        throw new Error("Invalid response structure from performSearch.");
      }

      console.log("AI Answer:", result.answer);
      console.log("Sources:", result.results); // Log the sources to confirm they contain title, link, and snippet

      const isAgenticPipeline = effectiveMode === "agentic";
      setAnswer(
        sanitizeAnswer(
          isAgenticPipeline ? result.answer : formatAnswerText(result.answer)
        )
      );
      // Always animate: live structured typing for a better experience
      setIsAnswerAnimating(true);
      setSearchResults(result.results || []); // Ensure searchResults is always an array
      setSources(Array.isArray(result.sources) ? result.sources : []);

      // Prepare local item and save to Firestore for authenticated users
      // include answer and sources in history item so clicks can load cached answers
      let newItem: any = {
        id: crypto.randomUUID(),
        query: queryString,
        answer: isAgenticPipeline
          ? result.answer
          : formatAnswerText(result.answer),
        sources: Array.isArray(result.sources) ? result.sources : [],
        mode: searchMode as "search" | "chat" | "agentic",
        timestamp: Date.now(),
        docId: undefined,
      };

      if (auth.currentUser?.uid) {
        const ref = await addDoc(
          collection(db, "users", auth.currentUser.uid, "searchHistory"),
          {
            query: queryString,
            answer: newItem.answer,
            sources: newItem.sources,
            mode: searchMode,
            model: selectedModel,
            timestamp: Date.now(),
          }
        );
        // attach docId to item when saving locally
        newItem.docId = ref.id;
      }

      // Update local state and persist to localStorage (keep answers)
      setSearchHistory((prev) => {
        const updated = [newItem, ...prev];
        try {
          localStorage.setItem("search_history", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      toast({
        title: "Search completed",
        description: `Found ${
          Array.isArray(result.results) ? result.results.length : 0
        } results.`,
      });

      // In parallel, fetch vertical results for tabs (Images, Videos, Shopping, News, Short videos)
      try {
        const [imgs, vids, shops, news, shorts] = await Promise.all([
          fetchSearchResults(queryString, "google_images").catch(() => []),
          fetchSearchResults(queryString, "google_videos").catch(() => []),
          fetchSearchResults(queryString, "google_shopping").catch(() => []),
          fetchSearchResults(queryString, "google_news").catch(() => []),
          fetchSearchResults(queryString, "google_short_videos").catch(
            () => []
          ),
        ]);

        // Normalize images to URL strings
        const pickUrl = (it: any) =>
          it?.image ||
          it?.thumbnail ||
          it?.thumbnail_url ||
          it?.thumbnailUrl ||
          it?.original ||
          it?.link ||
          it?.url ||
          null;
        setImageResults(
          Array.isArray(imgs) ? imgs.map(pickUrl).filter(Boolean) : []
        );

        // Normalize videos
        const toVideo = (it: any) => ({
          title: it?.title || it?.name || "Video",
          url: it?.link || it?.url || "",
          snippet: it?.snippet || it?.description || "",
          id: it?.id || it?.video_id || it?.link || it?.url,
        });
        setVideoResults(Array.isArray(vids) ? vids.map(toVideo) : []);

        // Normalize short videos
        setShortVideoResults(Array.isArray(shorts) ? shorts.map(toVideo) : []);

        // Normalize shopping
        const toItem = (it: any) => ({
          image: pickUrl(it) || "",
          name: it?.title || it?.name || "Item",
          price: it?.price || it?.price_str || it?.extracted_price || "",
          url: it?.link || it?.url || "",
          id: it?.id || it?.product_id || it?.link || it?.url,
        });
        setShoppingResults(Array.isArray(shops) ? shops.map(toItem) : []);

        // Normalize news
        const toNews = (it: any) => ({
          title: it?.title || it?.headline || "",
          source: it?.source || it?.publisher || it?.domain || "",
          link: it?.link || it?.url || "",
          image:
            it?.image ||
            it?.thumbnail ||
            it?.thumbnail_url ||
            it?.original ||
            null,
          id: it?.id || it?.link || it?.url,
        });
        setNewsResults(Array.isArray(news) ? news.map(toNews) : []);
      } catch (e) {
        console.warn("One or more vertical searches failed", e);
      }

      // Keep loader visible briefly so dynamic favicons and verticals can show
      const HANDOFF_MS = 650;
      setTimeout(() => setLoading(false), HANDOFF_MS);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform search.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setSuggestions([]); // Clear suggestions

    // Run search inline for all modes (including agentic)
    // reset any previous stop state
    setTypingStop(false);
    const q = searchTerm.trim();
    if (q) {
      // Enter conversation mode and record the user's message
      if (!conversationMode) setConversationMode(true);
      setMessages((prev) => [...prev, { role: "user", text: q }]);
    }
    handleSearch(searchTerm);
    setSearchTerm(""); // Clear the search term after submission
  };

  const handleStopTyping = () => {
    // Signal TypingAnimation to finish immediately
    setTypingStop(true);
    // Also mark animation as complete so UI updates
    setIsAnswerAnimating(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    if (!conversationMode) setConversationMode(true);
    setMessages((prev) => [...prev, { role: "user", text: suggestion }]);
    handleSearch(suggestion);
  };

  const handleHistoryItemClick = (
    query: string,
    mode: "search" | "chat" | "agentic",
    model?: "gpt-3.5" | "gpt-4.1" | "gpt-4o"
  ) => {
    // If an item includes an answer, load it into the UI instead of re-running the search
    const found = searchHistory.find((h) => h.query === query);
    if (found && (found as any).answer) {
      setSearchTerm(query);
      if (mode) setSearchMode(mode);
      if (model) setSelectedModel(model);
      setAnswer(sanitizeAnswer((found as any).answer || null));
      setSources((found as any).sources || []);
      setIsAnswerAnimating(false);
      return;
    }

    // Fallback: perform the search again if no cached answer
    setSearchTerm(query);
    if (mode) setSearchMode(mode);
    if (model) setSelectedModel(model);
    if (!conversationMode) setConversationMode(true);
    setMessages((prev) => [...prev, { role: "user", text: query }]);
    handleSearch(query);
  };

  const speakAnswer = (text: string, lang = "en-US") => {
    if (!window.speechSynthesis) {
      alert("Speech synthesis not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel(); // Stop previous speech if running

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();

    // Filter for natural-sounding female voices
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang === lang &&
        /female|natural|Google/.test(voice.name.toLowerCase())
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else {
      console.warn("Preferred female voice not found, using default.");
    }

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayToggle = (text?: string, lang?: string) => {
    const t = text ?? answer ?? "";
    const l = lang ?? selectedLang ?? "en-US";
    if (!window.speechSynthesis) {
      alert("Speech synthesis not supported in this browser.");
      return;
    }

    if (!t) {
      toast({ title: "No answer", description: "There is no answer to play." });
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // start playback
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t);
    utterance.lang = l;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.lang === l && /female|natural|google/i.test(voice.name)
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  // Load vertical results on demand when a result tab is clicked
  const handleTabClick = async (tab: string) => {
    setResultTab(tab);
    const engine = tabToEngine[tab];
    if (!engine) return; // Answer tab or unmapped tab

    const q = lastQuery || searchTerm;
    if (!q) {
      toast({
        title: "No query",
        description: "Run a search first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch vertical results for this engine
      const res = await fetchSearchResults(q, engine);

      const pickUrl = (it: any) =>
        it?.image ||
        it?.thumbnail ||
        it?.thumbnail_url ||
        it?.thumbnailUrl ||
        it?.original ||
        it?.link ||
        it?.url ||
        null;

      const toVideo = (it: any) => ({
        title: it?.title || it?.name || "Video",
        url: it?.link || it?.url || "",
        snippet: it?.snippet || it?.description || "",
        id: it?.id || it?.video_id || it?.link || it?.url,
      });

      const toItem = (it: any) => ({
        image: pickUrl(it) || "",
        name: it?.title || it?.name || "Item",
        price: it?.price || it?.price_str || it?.extracted_price || "",
        url: it?.link || it?.url || "",
        id: it?.id || it?.product_id || it?.link || it?.url,
      });

      const toNews = (it: any) => ({
        title: it?.title || it?.headline || "",
        source: it?.source || it?.publisher || it?.domain || "",
        link: it?.link || it?.url || "",
        image:
          it?.image ||
          it?.thumbnail ||
          it?.thumbnail_url ||
          it?.original ||
          null,
        id: it?.id || it?.link || it?.url,
      });

      if (tab === "Images") {
        setImageResults(
          Array.isArray(res) ? res.map(pickUrl).filter(Boolean) : []
        );
      } else if (tab === "Videos") {
        setVideoResults(Array.isArray(res) ? res.map(toVideo) : []);
      } else if (tab === "Short videos") {
        setShortVideoResults(Array.isArray(res) ? res.map(toVideo) : []);
      } else if (tab === "Shopping") {
        setShoppingResults(Array.isArray(res) ? res.map(toItem) : []);
      } else if (tab === "News") {
        setNewsResults(Array.isArray(res) ? res.map(toNews) : []);
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      toast({
        title: "Error",
        description: `Failed to load ${tab} results.`,
        variant: "destructive",
      });
    }
  };

  // Handlers for editing and deleting history items
  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditingText(item.query);
  };

  const handleSaveEdit = async (item: any) => {
    // update firestore if docId present
    try {
      if (item.docId && auth.currentUser?.uid) {
        const d = doc(
          db,
          "users",
          auth.currentUser.uid,
          "searchHistory",
          item.docId
        );
        await updateDoc(d, { query: editingText });
      }
      // update local state and localStorage
      setSearchHistory((prev) => {
        const updated = prev.map((p) =>
          p.id === item.id ? { ...p, query: editingText } : p
        );
        try {
          localStorage.setItem("search_history", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setEditingId(null);
      setEditingText("");
      toast({ title: "Saved", description: "History item renamed." });
    } catch (err) {
      console.error("Failed to save edit", err);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleDelete = async (item: any) => {
    try {
      if (item.docId && auth.currentUser?.uid) {
        const d = doc(
          db,
          "users",
          auth.currentUser.uid,
          "searchHistory",
          item.docId
        );
        await deleteDoc(d);
      }
      // update local state
      setSearchHistory((prev) => {
        const updated = prev.filter((p) => p.id !== item.id);
        try {
          localStorage.setItem("search_history", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      toast({ title: "Deleted", description: "History item removed." });
    } catch (err) {
      console.error("Failed to delete history item", err);
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  // If not authenticated, show loading state
  if (authLoading) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center text-lg animate-pulse">
        Authenticating... Please wait while we verify your credentials
      </div>
    );
  }

  if (!user) return null; // Optionally redirect

  // Slide panel state removed (left navbar and panels were removed)

  // Quick history overlay (top-left search panel)
  const [quickHistoryOpen, setQuickHistoryOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");

  // Inline Answer area tabs (Answer | Sources | Steps)
  const [answerTopTab, setAnswerTopTab] = useState<
    "answer" | "sources" | "steps"
  >("answer");
  const [stepsOpen, setStepsOpen] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  // Removed legacy sources slide-over panel state/effect

  // Nav/discover handlers removed

  return (
    <div className="flex h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background glow effect like in Hero section (hidden when an answer is shown) */}
      {!answer && <div className="absolute inset-0 bg-hero-glow z-0" />}

      {/* Theme toggle is placed in the top action bar below */}

      {/* Left navbar and panels removed for simplified layout */}

      {/* Quick History Overlay (top-left panel like attachment) */}
      <AnimatePresence>
        {quickHistoryOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-[70] flex items-start justify-center p-6"
          >
            {/* frosted backdrop layer */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/3 via-transparent to-white/4 backdrop-blur-xl" />
            <div className="w-full max-w-2xl bg-background/30 backdrop-blur-2xl rounded-lg overflow-hidden shadow-2xl border border-white/10">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <SearchIcon size={16} />
                <input
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  placeholder="Search all..."
                  className="flex-1 bg-transparent outline-none px-2 py-2 text-sm"
                />
                <button
                  className="text-sm text-muted-foreground px-2 py-1"
                  onClick={() => setQuickHistoryOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 py-3 text-xs text-muted-foreground">
                Yesterday
              </div>
              <div
                className="max-h-72 overflow-auto"
                onWheel={(e: React.WheelEvent) => {
                  // Keep wheel events inside the quick history panel native
                  e.stopPropagation();
                }}
              >
                {(searchHistory || [])
                  .filter((h) =>
                    h.query
                      .toLowerCase()
                      .includes(quickSearchQuery.toLowerCase())
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        handleHistoryItemClick(
                          item.query,
                          item.mode,
                          (item as any).model
                        )
                      }
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-t border-white/5 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                        <Lock size={14} />
                      </div>
                      <div className="flex-1 text-sm truncate">
                        {editingId === item.id ? (
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-transparent outline-none text-sm"
                          />
                        ) : (
                          item.query
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <button
                              title="Save"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(item);
                              }}
                              className="text-foreground p-1"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              title="Cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="text-muted-foreground p-1"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(item);
                              }}
                              className="text-muted-foreground p-1"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                              className="text-muted-foreground p-1"
                            >
                              <Trash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="px-4 py-3 text-xs text-muted-foreground border-t border-white/5">
                Click edit to rename • Click trash to delete • Esc close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left navbar removed; mobile menu button removed */}

      {/* Top-left quick search button (desktop & mobile) - hides when scrolled to answer */}
      <button
        className={`fixed left-3 top-3 z-50 bg-transparent text-foreground p-3 rounded-md flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-primary transition-opacity duration-200 ${
          showTopButtons ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setQuickHistoryOpen(true)}
        aria-label="Open quick history"
        aria-hidden={!showTopButtons}
      >
        <SearchIcon size={20} />
      </button>

      {/* Top-right profile button - hides when scrolled to answer */}
      <button
        ref={profileBtnRef}
        onClick={() => setProfileOpen((v) => !v)}
        className={`fixed right-3 top-3 z-50 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center border border-white/20 shadow-md hover:shadow-emerald-500/30 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-opacity duration-200 ${
          showTopButtons ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Open profile menu"
        aria-hidden={!showTopButtons}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "Profile"}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-sm font-semibold">
            {(user?.displayName || user?.email || "?").charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Profile dropdown panel */}
      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            ref={profilePanelRef}
            className="fixed top-16 right-3 w-64 rounded-xl bg-background/95 backdrop-blur-xl shadow-2xl z-[60] overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3 border-b border-border/60">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.displayName || user?.email || "?")
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">
                  {user?.displayName || "Anonymous"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                  <span className="truncate">
                    {user?.email
                      ? showEmail
                        ? user.email
                        : // mask local-part leaving first 3 and domain
                          user.email.replace(
                            /(^.{3})(.*)(@.*)$/,
                            (m, a, b, c) => `${a}${"•".repeat(3)}${c}`
                          )
                      : null}
                  </span>
                  <button
                    onClick={() => setShowEmail((v) => !v)}
                    className="p-1 rounded hover:bg-white/5"
                    title={showEmail ? "Hide email" : "Show email"}
                  >
                    <Eye className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>
            </div>
            <div className="py-2 text-sm">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/profile");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-left"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <div className="px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Theme
                </span>
                <div className="ml-auto flex items-center gap-2 bg-muted/40 rounded-full p-1">
                  <motion.button
                    onClick={() => setTheme("system")}
                    title="System"
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition`}
                    animate={{ scale: theme === "system" ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  >
                    <Monitor className="w-4 h-4" />
                    {theme === "system" && (
                      <Check className="absolute -bottom-1 -right-1 w-3 h-3 text-green-400 bg-background rounded-full p-[2px]" />
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setTheme("dark")}
                    title="Dark"
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition`}
                    animate={{ scale: theme === "dark" ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  >
                    <Moon className="w-4 h-4" />
                    {theme === "dark" && (
                      <Check className="absolute -bottom-1 -right-1 w-3 h-3 text-green-400 bg-background rounded-full p-[2px]" />
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setTheme("light")}
                    title="Light"
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition`}
                    animate={{ scale: theme === "light" ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  >
                    <Sun className="w-4 h-4" />
                    {theme === "light" && (
                      <Check className="absolute -bottom-1 -right-1 w-3 h-3 text-green-400 bg-background rounded-full p-[2px]" />
                    )}
                  </motion.button>
                </div>
              </div>
              <div className="my-2 border-t border-border/60" />
              <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-left">
                <FileTextIcon className="w-4 h-4" /> Terms
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-left">
                <Shield className="w-4 h-4" /> Privacy
              </button>
              <div className="my-2 border-t border-border/60" />
              <button
                onClick={() => {
                  auth.signOut();
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-left text-red-400"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sources slide-over panel */}
      <AnimatePresence>
        {sourcesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-black"
              onClick={() => setSourcesOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="ml-auto w-full max-w-md bg-background/95 backdrop-blur-lg border-l border-white/6 shadow-2xl overflow-auto"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white font-semibold">
                    S
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Sources</div>
                    <div className="text-xs text-muted-foreground">
                      {sources.length} items
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSourcesOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {sources && sources.length > 0 ? (
                  sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block rounded-lg hover:bg-white/3 p-3 transition-colors border border-white/6"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                          {/* favicon */}
                          <img
                            src={(() => {
                              try {
                                const u = new URL(s.url);
                                return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
                              } catch {
                                return "/favicon.png";
                              }
                            })()}
                            alt={s.title || s.url}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold truncate">
                              {s.title || s.url}
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {(s as any).date || ""}
                            </div>
                          </div>
                          {s.snippet && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-3">
                              {s.snippet}
                            </div>
                          )}
                          <div className="text-xs text-primary mt-2 truncate">
                            {s.url}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No sources available
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar removed: using full-width content area */}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-16 relative z-10 min-w-0">
        {/* Top right action bar removed per new UI spec */}

        {/* Content */}
        <div
          className="flex-1 px-4 sm:px-8 py-6 sm:py-8 overflow-y-auto min-w-0 custom-scrollbar chat-scroll-smooth"
          ref={(el) => {
            // assign ref for scroll tracking
            scrollContainerRef.current = el;
          }}
          onScroll={() => {
            // No-op here; real listener added in effect below to access latest answer
          }}
          onWheel={(e: React.WheelEvent) => {
            // Prevent wheel from bubbling to page-level smooth scroller (Lenis)
            // so native scrollable areas behave normally with mouse wheel.
            e.stopPropagation();
          }}
        >
          {/* --- Render main content or nested routes --- */}
          {location.pathname === "/search" ? (
            <div className="w-full max-w-3xl mx-auto text-center px-2 sm:px-0">
              {" "}
              {/* Added text-center */}
              {/* Hide branding and toggles in conversation mode */}
              {!conversationMode && (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    Nelieo
                  </h1>
                  <p className="text-muted-foreground mb-4 sm:mb-6">
                    Ask questions, get research, or start a conversation
                  </p>
                </>
              )}
              {/* Tabs */}
              <Tabs
                defaultValue="search"
                value={searchMode}
                onValueChange={(value) =>
                  setSearchMode(value as "search" | "chat" | "agentic")
                }
                className="mb-6"
              >
                {!conversationMode && (
                  <TabsList className="bg-gray-100/80 dark:bg-gray-800/60 p-1 rounded-md flex-wrap">
                    <TabsTrigger value="search" className="rounded-sm">
                      <SearchIcon size={16} className="mr-2" />
                      Search
                    </TabsTrigger>
                    <TabsTrigger
                      value="chat"
                      className="rounded-sm"
                      onClick={() => navigate("/chatpage")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                      Chat
                    </TabsTrigger>

                    <TabsTrigger
                      value="agentic"
                      className="rounded-sm"
                      onClick={() => navigate("/ai-os")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="8"
                          rx="2"
                          ry="2"
                        ></rect>
                        <rect
                          x="2"
                          y="14"
                          width="20"
                          height="8"
                          rx="2"
                          ry="2"
                        ></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                      </svg>
                      Agentic
                    </TabsTrigger>
                  </TabsList>
                )}

                {/* Search form - Responsive version (hidden in conversation mode) */}
                <div
                  className={`mt-4 px-0 sm:px-4 ${
                    conversationMode ? "hidden" : ""
                  }`}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearchSubmit();
                    }}
                    className="relative mb-6 animate-fade-in"
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="relative max-w-full sm:max-w-2xl mx-auto">
                      <Input
                        type="text"
                        placeholder={
                          searchMode === "search"
                            ? "Search..."
                            : searchMode === "chat"
                            ? "Chat..."
                            : "Search..."
                        }
                        className="search-input h-12 sm:h-14 pl-10 sm:pl-12 pr-16 sm:pr-40 rounded-full border border-white/20 placeholder:text-muted-foreground text-sm sm:text-base w-full"
                        value={searchTerm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchTerm(val);
                          if (val.length > 1) {
                            fetch(
                              `https://cognix-api.onrender.com/api/suggest?q=${encodeURIComponent(
                                val
                              )}`
                            )
                              .then((res) => res.json())
                              .then((data) =>
                                setSuggestions(data.suggestions || [])
                              );
                          } else {
                            setSuggestions([]);
                          }
                        }}
                      />
                      <SearchIcon
                        className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                      />

                      {/* Right-side buttons container - Responsive */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                        {/* Focus button (replaces Launch AI Assistant) */}
                        <BrandedTooltip content="Focus search input">
                          <motion.button
                            onClick={() =>
                              (
                                document.querySelector(
                                  ".search-input"
                                ) as HTMLInputElement | null
                              )?.focus()
                            }
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full transition shadow-sm backdrop-blur-md bg-white/6 hover:bg-white/10 border border-white/20"
                            title="Focus search"
                          >
                            <Focus
                              className="text-slate-700 dark:text-slate-200"
                              size={16}
                            />
                          </motion.button>
                        </BrandedTooltip>

                        {/* Dynamic Mic/Send Button */}
                        {searchTerm.trim() === "" ? (
                          <BrandedTooltip
                            content={
                              isListening ? "Recording..." : "Click to speak"
                            }
                          >
                            <motion.button
                              type="button"
                              onClick={() => {
                                const SpeechRecognition =
                                  window.SpeechRecognition ||
                                  (window as any).webkitSpeechRecognition;
                                if (!SpeechRecognition) {
                                  alert(
                                    "Speech recognition not supported in this browser."
                                  );
                                  return;
                                }

                                const recognition = new SpeechRecognition();
                                recognition.lang = "en-US";
                                recognition.interimResults = false;
                                recognition.maxAlternatives = 1;

                                recognition.onstart = () =>
                                  setIsListening(true);
                                recognition.onend = () => setIsListening(false);

                                recognition.onresult = (event) => {
                                  const spokenText =
                                    event.results[0][0].transcript;
                                  setSearchTerm(spokenText);
                                  setSuggestions([]); // Clear suggestions
                                  handleSearch(spokenText); // Auto-run search
                                };

                                recognition.onerror = (event: any) => {
                                  console.error(
                                    "Speech recognition error",
                                    event.error
                                  );
                                };

                                recognition.start();
                              }}
                              className={`p-1.5 sm:p-2 rounded-full transition ${
                                isListening
                                  ? "bg-red-600 hover:bg-red-500 animate-pulse"
                                  : "bg-primary/20 hover:bg-primary/30"
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {isListening ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                  stroke="currentColor"
                                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                                >
                                  <rect
                                    x="6"
                                    y="6"
                                    width="12"
                                    height="12"
                                    rx="2"
                                  />
                                </svg>
                              ) : (
                                <Mic size={16} />
                              )}
                            </motion.button>
                          </BrandedTooltip>
                        ) : null}

                        {/* Search/Submit or Stop Button (when AI is typing) */}
                        {!isAnswerAnimating ? (
                          <Button
                            type="submit"
                            className="h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                            disabled={loading}
                          >
                            {loading
                              ? "..."
                              : searchMode === "search"
                              ? window.innerWidth < 400
                                ? "Search"
                                : "Search"
                              : searchMode === "chat"
                              ? window.innerWidth < 400
                                ? "Chat"
                                : "Chat"
                              : window.innerWidth < 400
                              ? "Go"
                              : "Go"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleStopTyping}
                            className="h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm bg-red-500 hover:bg-red-400 text-white rounded-full"
                          >
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Result category toggle (like image attachment) - show only when an answer exists */}
                  {answer && (
                    <div className="mt-4 mb-2">
                      <div className="w-full">
                        {/* Mobile: horizontal scroll with snap; Desktop: centered inline group */}
                        <div className="-mx-4 px-4">
                          <div className="relative">
                            <div className="flex gap-2 items-center overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 justify-start sm:justify-center">
                              {resultTabs.map((tab) => {
                                const isActive = resultTab === tab;
                                const icon =
                                  tab === "Images" ? (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="14"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="1.2"
                                      />
                                    </svg>
                                  ) : tab === "Videos" ? (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M5 3v18l15-9z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                  ) : tab === "Shopping" ? (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M6 6h15l-1.5 9h-12z"
                                        stroke="currentColor"
                                        strokeWidth="1.2"
                                      />
                                    </svg>
                                  ) : tab === "News" ? (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="16"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="1.2"
                                      />
                                    </svg>
                                  ) : tab === "Short videos" ? (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                        stroke="currentColor"
                                        strokeWidth="1.2"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"
                                        stroke="currentColor"
                                        strokeWidth="1"
                                      />
                                    </svg>
                                  );

                                return (
                                  <button
                                    key={tab}
                                    onClick={() => handleTabClick(tab)}
                                    className={`snap-start inline-flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-xl transition-all duration-180 ${
                                      isActive
                                        ? theme === "light"
                                          ? "bg-white/90 text-gray-900 shadow-sm"
                                          : "bg-white/8 text-white shadow-sm"
                                        : "bg-transparent text-muted-foreground"
                                    }`}
                                    style={{ minWidth: 88 }}
                                  >
                                    <span
                                      className={`w-4 h-4 ${
                                        isActive
                                          ? "text-primary"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {icon}
                                    </span>
                                    <span
                                      className="text-sm font-medium truncate"
                                      style={{ maxWidth: 120 }}
                                    >
                                      {tab}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {/* subtle active underline indicator */}
                            <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-transparent to-transparent" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Searching animation removed as requested */}

                  {/* Search Suggestions - Mobile responsive */}
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative bg-card border border-border rounded-lg shadow-lg z-50 w-full max-w-full sm:max-w-2xl mx-auto"
                    >
                      {suggestions.slice(0, 5).map((sug, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-muted transition-all"
                          onClick={() => {
                            setSearchTerm(sug);
                            setSuggestions([]); // Clear suggestions
                            handleSearchSubmit(); // Perform search
                          }}
                        >
                          <SearchIcon
                            className="text-primary flex-shrink-0"
                            size={14}
                          />
                          <span className="truncate text-left">{sug}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Removed image/shopping/news/sources toggle group */}

                {/* Enhanced Answer section */}
                <AnimatePresence>
                  {answer && resultTab === "Answer" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="answer-root mt-8 mb-6 w-full max-w-full sm:max-w-4xl mx-auto px-2 sm:px-0"
                    >
                      {/* If in conversation mode, show the last user message as a chat bubble */}
                      {conversationMode && messages.length > 0 && (
                        <div className="mb-4 flex justify-end">
                          <div className="max-w-[85%] rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm shadow-lg backdrop-blur-md">
                            {messages[messages.length - 1].text}
                          </div>
                        </div>
                      )}
                      {/* Boxless answer layout: removed bg/border/shadow */}
                      <div className="px-2 py-4">
                        {/* Answer/Sources/Steps slider */}
                        <div className="mb-3 flex items-center gap-4 text-sm select-none">
                          <button
                            className={`relative py-1 text-foreground/90 ${
                              answerTopTab === "answer" && !stepsOpen
                                ? "font-semibold"
                                : ""
                            }`}
                            onClick={() => {
                              setAnswerTopTab("answer");
                              setStepsOpen(false);
                            }}
                          >
                            <span>Answer</span>
                            {answerTopTab === "answer" && !stepsOpen && (
                              <span className="absolute left-0 -bottom-1 h-0.5 w-full bg-foreground/80 rounded" />
                            )}
                          </button>
                          <button
                            className={`relative flex items-center gap-2 py-1 text-foreground/90 ${
                              answerTopTab === "sources" ? "font-semibold" : ""
                            }`}
                            onClick={() => {
                              setStepsOpen(false);
                              setAnswerTopTab("sources");
                            }}
                            title="Show sources"
                          >
                            {/* minimal stacked favicons placeholder */}
                            <span className="inline-flex -space-x-2">
                              <span className="w-4 h-4 rounded-full bg-gray-300/80 dark:bg-white/20 border border-gray-400/60 dark:border-white/20 inline-block" />
                              <span className="w-4 h-4 rounded-full bg-gray-200/80 dark:bg-white/15 border border-gray-300/60 dark:border-white/20 inline-block" />
                              <span className="w-4 h-4 rounded-full bg-gray-100/80 dark:bg-white/10 border border-gray-300/60 dark:border-white/20 inline-block" />
                            </span>
                            <span>
                              Sources
                              {Array.isArray(sources) && sources.length ? (
                                <span className="opacity-70">
                                  {" "}
                                  · {sources.length}
                                </span>
                              ) : null}
                            </span>
                            {answerTopTab === "sources" && (
                              <span className="absolute left-0 -bottom-1 h-0.5 w-full bg-foreground/80 rounded" />
                            )}
                          </button>
                          <button
                            className={`relative py-1 text-foreground/90 ${
                              stepsOpen ? "font-semibold" : ""
                            }`}
                            onClick={() => {
                              setAnswerTopTab("steps");
                              setStepsOpen((v) => !v);
                            }}
                            title="Show processing steps"
                          >
                            <span>Steps</span>
                            {stepsOpen && (
                              <span className="absolute left-0 -bottom-1 h-0.5 w-full bg-foreground/80 rounded" />
                            )}
                          </button>
                        </div>

                        {/* Inline Sources panel */}
                        {answerTopTab === "sources" && !stepsOpen && (
                          <div className="mb-6 space-y-4">
                            {Array.isArray(sources) && sources.length > 0 ? (
                              <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden bg-background/40 backdrop-blur-sm">
                                {sources.map((s, i) => {
                                  const urlObj = (() => {
                                    try {
                                      return new URL(s.url);
                                    } catch {
                                      return null;
                                    }
                                  })();
                                  const hostname =
                                    urlObj?.hostname.replace(/^www\./, "") ||
                                    "";
                                  return (
                                    <a
                                      key={i}
                                      href={s.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group px-4 py-3 flex gap-4 items-start hover:bg-white/5 transition-colors no-underline"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                            {hostname || "SOURCE"}
                                          </span>
                                          {(s as any).date && (
                                            <span className="text-[10px] text-muted-foreground/60">
                                              {(s as any).date}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm font-medium text-foreground/90 group-hover:text-foreground line-clamp-1">
                                          {s.title || s.url}
                                        </div>
                                        {s.snippet && (
                                          <div className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2 mt-0.5">
                                            {s.snippet}
                                          </div>
                                        )}
                                        <div className="text-[11px] text-muted-foreground/60 mt-1 truncate">
                                          {s.url}
                                        </div>
                                      </div>
                                      <div className="w-10 h-10 flex-shrink-0 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden ring-1 ring-border/50 group-hover:ring-border/80 transition">
                                        <img
                                          src={`https://icons.duckduckgo.com/ip3/${
                                            urlObj?.hostname || ""
                                          }.ico`}
                                          alt={hostname || s.title || s.url}
                                          className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100"
                                          onError={(e) => {
                                            (
                                              e.currentTarget as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground/60 py-6 text-center border border-dashed border-border/40 rounded-lg">
                                No sources captured for this answer yet.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Steps panel */}
                        {stepsOpen && (
                          <div className="mb-6 relative">
                            {(() => {
                              const plan =
                                (searchHistory?.[0] as any)?.plan || null;
                              const planItems: Array<{ query: string }> =
                                Array.isArray(plan?.subqueries)
                                  ? plan.subqueries.slice(0, 8)
                                  : [];
                              const totalSources = Array.isArray(sources)
                                ? sources.length
                                : 0;
                              const topSources = (
                                Array.isArray(sources) ? sources : []
                              ).slice(0, 4);
                              const rankedCount = Array.isArray(searchResults)
                                ? searchResults.length
                                : 0;
                              const uniqueDomains = Array.from(
                                new Set(
                                  (Array.isArray(sources) ? sources : [])
                                    .map((s: any) => {
                                      try {
                                        return new URL(s.url).hostname.replace(
                                          /^www\./,
                                          ""
                                        );
                                      } catch {
                                        return "";
                                      }
                                    })
                                    .filter(Boolean)
                                )
                              );
                              const v = verification as any | null;
                              const contradictions: any[] = Array.isArray(
                                v?.contradictions
                              )
                                ? v!.contradictions
                                : [];
                              const shownContradictions = contradictions.slice(
                                0,
                                2
                              );
                              const hasImages =
                                Array.isArray(imageResults) &&
                                imageResults.length > 0;
                              const shownImages = hasImages
                                ? imageResults.slice(0, 6)
                                : [];
                              const wordCount = (answer || "")
                                .split(/\s+/)
                                .filter(Boolean).length;
                              const readMin = Math.max(
                                1,
                                Math.round(wordCount / 180)
                              );

                              const steps = [
                                {
                                  id: "planning",
                                  title: "Planning",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="m9 12 2 2 4-4" />
                                      <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                                      <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                                      <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                                      <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-3">
                                      {planItems.length > 0 ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground/90">
                                              {planItems.length} subqueries
                                              planned
                                            </span>
                                          </div>
                                          <div className="grid gap-2">
                                            {planItems.map(
                                              (p: any, i: number) => (
                                                <div
                                                  key={i}
                                                  className="group relative text-sm px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 text-foreground/85 border border-primary/20 hover:border-primary/30 hover:from-primary/8 hover:to-primary/15 transition-all duration-200 cursor-default"
                                                  title={p.query}
                                                >
                                                  <div className="absolute left-2 top-2 w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                                                  <div className="pl-3">
                                                    {p.query.length > 45
                                                      ? `${p.query.slice(
                                                          0,
                                                          45
                                                        )}...`
                                                      : p.query}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                          <span className="text-sm text-muted-foreground/80">
                                            Direct query processing
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                },
                                {
                                  id: "retrieval",
                                  title: "Retrieval",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <circle cx="11" cy="11" r="8" />
                                      <path d="m21 21-4.35-4.35" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground/80">
                                          {totalSources} sources from{" "}
                                          {uniqueDomains.length} domains
                                        </span>
                                      </div>
                                      {topSources.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {topSources.map(
                                            (s: any, i: number) => {
                                              let domain = "";
                                              try {
                                                domain = new URL(
                                                  s.url
                                                ).hostname.replace(
                                                  /^www\./,
                                                  ""
                                                );
                                              } catch {}
                                              return (
                                                <a
                                                  key={i}
                                                  href={s.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="group flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg bg-gradient-to-r from-muted/20 to-muted/30 hover:from-muted/30 hover:to-muted/40 border border-border/30 hover:border-border/50 transition-all duration-200 no-underline"
                                                >
                                                  <img
                                                    src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                                                    alt={domain}
                                                    className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 flex-shrink-0"
                                                    onError={(e) =>
                                                      ((
                                                        e.currentTarget as HTMLImageElement
                                                      ).style.display = "none")
                                                    }
                                                  />
                                                  <span className="text-foreground/80 group-hover:text-foreground/95 transition-colors truncate">
                                                    {domain || s.title || s.url}
                                                  </span>
                                                </a>
                                              );
                                            }
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ),
                                },
                                {
                                  id: "ranking",
                                  title: "Ranking",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M3 3h18v18H3zM9 9h6v6H9z" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground/90">
                                          {rankedCount} passages ranked by
                                          relevance
                                        </span>
                                      </div>
                                      {Array.isArray(searchResults) &&
                                        searchResults.length > 0 && (
                                          <div className="grid gap-2">
                                            {searchResults
                                              .slice(0, 3)
                                              .map((r: any, i: number) => {
                                                let domain = "";
                                                try {
                                                  domain = new URL(
                                                    r.url
                                                  ).hostname.replace(
                                                    /^www\./,
                                                    ""
                                                  );
                                                } catch {}
                                                return (
                                                  <div
                                                    key={r.id || r.url || i}
                                                    className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gradient-to-r from-muted/10 to-muted/20 border border-border/20 hover:border-border/40 hover:from-muted/15 hover:to-muted/25 transition-all duration-200"
                                                  >
                                                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                      {i + 1}
                                                    </span>
                                                    <a
                                                      href={r.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="truncate hover:underline text-foreground/80 hover:text-foreground/95 transition-colors flex-1"
                                                    >
                                                      {r.title ||
                                                        domain ||
                                                        r.url}
                                                    </a>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        )}
                                    </div>
                                  ),
                                },
                                {
                                  id: "fusion",
                                  title: "Fusion",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M12 2L2 7v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7l-10-5z" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground/90">
                                          Merged{" "}
                                          {Math.max(
                                            1,
                                            Math.min(rankedCount, 12)
                                          )}{" "}
                                          snippets from {uniqueDomains.length}{" "}
                                          sources
                                        </span>
                                      </div>
                                      <div className="p-3 rounded-lg bg-gradient-to-r from-amber/5 to-orange/10 border border-amber/20">
                                        <p className="text-sm text-foreground/75 leading-relaxed">
                                          Context-aware evidence synthesis
                                        </p>
                                      </div>
                                    </div>
                                  ),
                                },
                                {
                                  id: "verification",
                                  title: "Verification",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        {v?.confidence != null && (
                                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                                            <div className="w-2 h-2 rounded-full bg-green-500/60"></div>
                                            <span className="text-sm font-medium text-green-700/90 dark:text-green-400/90">
                                              Confidence: {v.confidence}
                                            </span>
                                          </div>
                                        )}
                                        {contradictions.length > 0 && (
                                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                            <div className="w-2 h-2 rounded-full bg-amber-500/60"></div>
                                            <span className="text-sm font-medium text-amber-700/90 dark:text-amber-400/90">
                                              {contradictions.length}{" "}
                                              contradictions found
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {shownContradictions.length > 0 && (
                                        <div className="grid gap-2">
                                          {shownContradictions.map(
                                            (c: any, i: number) => (
                                              <div
                                                key={i}
                                                className="p-3 rounded-lg bg-gradient-to-r from-amber/5 to-red/10 border border-amber/20 text-sm text-foreground/75 leading-relaxed"
                                              >
                                                {typeof c === "string"
                                                  ? c
                                                  : JSON.stringify(c)}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ),
                                },
                                ...(hasImages
                                  ? [
                                      {
                                        id: "images",
                                        title: "Images",
                                        icon: (
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <rect
                                              x="3"
                                              y="3"
                                              width="18"
                                              height="18"
                                              rx="2"
                                              ry="2"
                                            />
                                            <circle cx="9" cy="9" r="2" />
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                          </svg>
                                        ),
                                        content: (
                                          <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-foreground/90">
                                                {imageResults.length} images
                                                extracted
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                              {shownImages.map(
                                                (src: string, i: number) => (
                                                  <div
                                                    key={i}
                                                    className="aspect-square rounded-lg overflow-hidden bg-muted/10 border border-border/20 hover:border-border/40 transition-all duration-200 group"
                                                  >
                                                    <img
                                                      src={src}
                                                      alt={`img-${i}`}
                                                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200"
                                                    />
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        ),
                                      },
                                    ]
                                  : []),
                                {
                                  id: "generation",
                                  title: "Generation",
                                  icon: (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14,2 14,8 20,8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                      <polyline points="10,9 9,9 8,9" />
                                    </svg>
                                  ),
                                  content: (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                          <div className="w-2 h-2 rounded-full bg-blue-500/60"></div>
                                          <span className="text-sm font-medium text-blue-700/90 dark:text-blue-400/90">
                                            {wordCount} words
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                                          <div className="w-2 h-2 rounded-full bg-purple-500/60"></div>
                                          <span className="text-sm font-medium text-purple-700/90 dark:text-purple-400/90">
                                            ~{readMin} min read
                                          </span>
                                        </div>
                                      </div>
                                      <div className="p-3 rounded-lg bg-gradient-to-r from-green/5 to-emerald/10 border border-green/20">
                                        <p className="text-sm text-foreground/75 leading-relaxed">
                                          Answer composition complete
                                        </p>
                                      </div>
                                    </div>
                                  ),
                                },
                              ];

                              return (
                                <div className="relative pl-12 py-4">
                                  {/* Enhanced Timeline line with gradient and glow */}
                                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent rounded-full shadow-sm"></div>

                                  <div className="space-y-8">
                                    {steps.map((step, index) => (
                                      <div key={step.id} className="relative">
                                        {/* Enhanced Timeline dot with animation */}
                                        <div className="absolute -left-[30px] top-2.5 w-4 h-4 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110">
                                          <div className="w-2 h-2 rounded-full bg-primary/60 transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]"></div>
                                        </div>

                                        {/* Step content with enhanced styling */}
                                        <div className="group hover:bg-muted/15 hover:backdrop-blur-sm rounded-xl p-4 -m-4 transition-all duration-300 hover:shadow-sm border border-transparent hover:border-muted/20">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="text-muted-foreground/80 group-hover:text-primary/90 transition-all duration-300 flex-shrink-0 p-1">
                                              {step.icon}
                                            </div>
                                            <h4 className="text-base font-semibold text-foreground/90 group-hover:text-foreground transition-colors duration-300 tracking-wide">
                                              {step.title}
                                            </h4>
                                          </div>
                                          <div className="ml-8 space-y-2">
                                            {step.content}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {/* Inline compact sources row */}
                        {Array.isArray(searchResults) &&
                          searchResults.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
                                  Sources
                                </h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground/80">
                                  Top {Math.min(searchResults.length, 6)}
                                </span>
                              </div>
                              <div className="relative">
                                <div className="flex gap-3 overflow-x-auto pb-1 custom-src-scroll">
                                  {searchResults
                                    .slice(0, 6)
                                    .map((r: any, idx: number) => {
                                      const domain = (() => {
                                        try {
                                          return new URL(
                                            r.url
                                          ).hostname.replace(/^www\./, "");
                                        } catch {
                                          return "";
                                        }
                                      })();
                                      return (
                                        <a
                                          key={r.id || r.url || idx}
                                          href={r.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="group relative flex-shrink-0 w-52 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:border-purple-500/60 hover:bg-card/80 transition-colors duration-200 p-3 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                          aria-label={`Open source ${
                                            r.title || domain
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center ring-1 ring-purple-500/30 overflow-hidden">
                                              {/* favicon */}
                                              <img
                                                src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                                                onError={(e) => {
                                                  (
                                                    e.currentTarget as HTMLImageElement
                                                  ).style.display = "none";
                                                }}
                                                alt={domain}
                                                className="w-5 h-5 object-contain opacity-90 group-hover:opacity-100"
                                              />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-medium leading-snug text-foreground/90 line-clamp-2 group-hover:text-foreground">
                                                {r.title ||
                                                  domain ||
                                                  "Untitled"}
                                              </p>
                                              <p className="text-[10px] mt-1 text-muted-foreground/70 truncate">
                                                {domain || r.url}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
                                        </a>
                                      );
                                    })}
                                </div>
                                <style>{`
                                .custom-src-scroll::-webkit-scrollbar { height: 6px; }
                                .custom-src-scroll::-webkit-scrollbar-track { background: transparent; }
                                .custom-src-scroll::-webkit-scrollbar-thumb { background: linear-gradient(90deg, rgba(168,85,247,0.35), rgba(236,72,153,0.35)); border-radius: 3px; }
                                .custom-src-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(90deg, rgba(168,85,247,0.55), rgba(236,72,153,0.55)); }
                              `}</style>
                              </div>
                            </div>
                          )}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3
                              className={`text-base font-semibold ${
                                theme === "light"
                                  ? "text-gray-800"
                                  : "text-white"
                              }`}
                            >
                              {searchMode === "search"
                                ? ""
                                : searchMode === "chat"
                                ? "Chat Response"
                                : "Research Analysis"}
                            </h3>
                          </div>

                          {/* Play/Copy moved into StructuredAnswer footer */}
                        </div>

                        <div className="prose max-w-none text-left min-w-0">
                          {isAnswerAnimating ? (
                            <>
                              <StructuredAnswer
                                answerText={livePartial || ""}
                                sources={sources}
                                onPlayToggle={handlePlayToggle}
                                isPlaying={isPlaying}
                                onCopy={(t) => {
                                  try {
                                    navigator.clipboard.writeText(t || "");
                                    toast({
                                      title: "Copied",
                                      description:
                                        "Answer copied to clipboard.",
                                    });
                                  } catch (err) {
                                    toast({
                                      title: "Copy failed",
                                      description: "Unable to copy answer.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              />
                              <TypingAnimation
                                text={answer || ""}
                                speed={6}
                                typingDelay={150}
                                stop={typingStop}
                                onUpdate={(t) => setLivePartial(t)}
                                onComplete={() => setIsAnswerAnimating(false)}
                                className="sr-only"
                              />
                            </>
                          ) : (
                            <StructuredAnswer
                              answerText={answer || ""}
                              sources={sources}
                              onPlayToggle={handlePlayToggle}
                              isPlaying={isPlaying}
                              onCopy={(t) => {
                                try {
                                  navigator.clipboard.writeText(t || "");
                                  toast({
                                    title: "Copied",
                                    description: "Answer copied to clipboard.",
                                  });
                                } catch (err) {
                                  toast({
                                    title: "Copy failed",
                                    description: "Unable to copy answer.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Inline clickable sources removed — use the Sources slide-over instead */}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom docked input when conversation mode is active (matches top search bar) */}
                <AnimatePresence>
                  {conversationMode && (
                    <motion.form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchSubmit();
                      }}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 50, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 24,
                      }}
                      className="fixed left-0 right-0 mx-auto bottom-4 sm:bottom-6 z-[60] w-[92%] sm:w-[640px]"
                    >
                      <div className="relative max-w-full mx-auto">
                        <Input
                          type="text"
                          placeholder={
                            searchMode === "search"
                              ? "Search..."
                              : searchMode === "chat"
                              ? "Chat..."
                              : "Search..."
                          }
                          className="search-input h-12 sm:h-14 pl-10 sm:pl-12 pr-16 sm:pr-40 rounded-full border border-white/20 placeholder:text-muted-foreground text-sm sm:text-base w-full"
                          value={searchTerm}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchTerm(val);
                            if (val.length > 1) {
                              fetch(
                                `https://cognix-api.onrender.com/api/suggest?q=${encodeURIComponent(
                                  val
                                )}`
                              )
                                .then((res) => res.json())
                                .then((data) =>
                                  setSuggestions(data.suggestions || [])
                                );
                            } else {
                              setSuggestions([]);
                            }
                          }}
                        />
                        <SearchIcon
                          className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={16}
                        />

                        {/* Right-side buttons container - same as top */}
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                          {/* Focus button */}
                          <BrandedTooltip content="Focus search input">
                            <motion.button
                              onClick={(e) => {
                                e.preventDefault();
                                // Focus the closest search-input within this form to avoid focusing the hidden top bar
                                const formEl =
                                  (e.currentTarget.closest(
                                    "form"
                                  ) as HTMLFormElement) || undefined;
                                const input = formEl?.querySelector(
                                  ".search-input"
                                ) as HTMLInputElement | null;
                                (
                                  input ||
                                  (document.querySelector(
                                    ".search-input"
                                  ) as HTMLInputElement | null)
                                )?.focus();
                              }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full transition shadow-sm backdrop-blur-md bg-white/6 hover:bg-white/10 border border-white/20"
                              title="Focus search"
                            >
                              <Focus
                                className="text-slate-700 dark:text-slate-200"
                                size={16}
                              />
                            </motion.button>
                          </BrandedTooltip>

                          {/* Dynamic Mic/Send Button */}
                          {searchTerm.trim() === "" ? (
                            <BrandedTooltip
                              content={
                                isListening ? "Recording..." : "Click to speak"
                              }
                            >
                              <motion.button
                                type="button"
                                onClick={() => {
                                  const SpeechRecognition =
                                    (window as any).SpeechRecognition ||
                                    (window as any).webkitSpeechRecognition;
                                  if (!SpeechRecognition) {
                                    alert(
                                      "Speech recognition not supported in this browser."
                                    );
                                    return;
                                  }

                                  const recognition = new SpeechRecognition();
                                  recognition.lang = "en-US";
                                  recognition.interimResults = false;
                                  recognition.maxAlternatives = 1;

                                  recognition.onstart = () =>
                                    setIsListening(true);
                                  recognition.onend = () =>
                                    setIsListening(false);

                                  recognition.onresult = (event: any) => {
                                    const spokenText =
                                      event.results[0][0].transcript;
                                    setSearchTerm(spokenText);
                                    setSuggestions([]);
                                    handleSearch(spokenText);
                                  };

                                  recognition.onerror = (event: any) => {
                                    console.error(
                                      "Speech recognition error",
                                      event.error
                                    );
                                  };

                                  recognition.start();
                                }}
                                className={`p-1.5 sm:p-2 rounded-full transition ${
                                  isListening
                                    ? "bg-red-600 hover:bg-red-500 animate-pulse"
                                    : "bg-primary/20 hover:bg-primary/30"
                                }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {isListening ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                                  >
                                    <rect
                                      x="6"
                                      y="6"
                                      width="12"
                                      height="12"
                                      rx="2"
                                    />
                                  </svg>
                                ) : (
                                  <Mic size={16} />
                                )}
                              </motion.button>
                            </BrandedTooltip>
                          ) : null}

                          {/* Search/Submit or Stop Button (when AI is typing) */}
                          {!isAnswerAnimating ? (
                            <Button
                              type="submit"
                              className="h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                              disabled={loading}
                            >
                              {loading
                                ? "..."
                                : searchMode === "search"
                                ? window.innerWidth < 400
                                  ? "Search"
                                  : "Search"
                                : searchMode === "chat"
                                ? window.innerWidth < 400
                                  ? "Chat"
                                  : "Chat"
                                : window.innerWidth < 400
                                ? "Go"
                                : "Go"}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={handleStopTyping}
                              className="h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm bg-red-500 hover:bg-red-400 text-white rounded-full"
                            >
                              Stop
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Tab results area: render only the active tab's content and show empty message when no items */}
                <div className="mt-8">
                  {resultTab === "Images" ? (
                    imageResults.length > 0 ? (
                      <ImageGallery images={imageResults} />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        There are no matching images for this query.
                      </div>
                    )
                  ) : resultTab === "Shopping" ? (
                    shoppingResults.length > 0 ? (
                      <ShoppingResults items={shoppingResults} />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        There are no matching shopping results for this query.
                      </div>
                    )
                  ) : resultTab === "News" ? (
                    newsResults.length > 0 ? (
                      <NewsPanel news={newsResults} />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        There are no matching news articles for this query.
                      </div>
                    )
                  ) : resultTab === "Videos" || resultTab === "Short videos" ? (
                    (resultTab === "Videos" ? videoResults : shortVideoResults)
                      .length > 0 ? (
                      resultTab === "Videos" ? (
                        <VideoGrid items={videoResults} />
                      ) : (
                        <ShortVideoGrid items={shortVideoResults} />
                      )
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        There are no matching videos for this query.
                      </div>
                    )
                  ) : // Default: Answer / Sources tab
                  searchResults.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Sources:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map((result) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 bg-card border border-border rounded-lg"
                          >
                            <h4 className="font-medium mb-1 text-sm md:text-base">
                              {result.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                              {result.content}
                            </p>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm hover:underline break-all"
                            >
                              {result.url}
                            </a>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Removed Image Gallery */}
              </Tabs>
            </div>
          ) : (
            <Outlet /> // Render nested routes or main content
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;

// GlassyButton: liquid glassy background control used in video modal
const GlassyButton = ({
  children,
  onClick,
  href,
  ariaLabel,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
}) => {
  const base =
    "relative inline-flex items-center gap-2 px-3 py-2 rounded-full text-white border border-white/15 bg-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.6)] overflow-hidden group hover:bg-white/15 transition";
  const innerOverlay = (
    <>
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 opacity-40 group-hover:opacity-60 transition" />
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-white/30 blur-xl -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
        className={`${base} ${className}`}
      >
        {innerOverlay}
        <span className="relative z-10">{children}</span>
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`${base} ${className}`}
    >
      {innerOverlay}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

// TabButton Component
const TabButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition shadow-md"
  >
    {label}
  </button>
);

// ShoppingResults Component
const ShoppingResults = ({
  items,
}: {
  items: Array<{ image: string; name: string; price: string }>;
}) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {items.map((item, index) => (
      <div key={index} className="bg-white/5 rounded-xl p-3 shadow-lg">
        <img src={item.image} alt={item.name} className="rounded" />
        <p className="text-white text-sm font-semibold mt-1">{item.name}</p>
        <p className="text-sm text-gray-300">{item.price}</p>
      </div>
    ))}
  </div>
);

// NewsPanel Component — modern glassy cards
const NewsPanel = ({
  news,
}: {
  news: Array<{
    title: string;
    source?: string | { name?: string; title?: string; icon?: string } | null;
    link?: string;
    url?: string;
    image?: string | null;
  }>;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {news.map((item, i) => {
      let srcText = "";
      let iconUrl: string | null = null;
      if (typeof item.source === "string") {
        srcText = item.source;
        try {
          const u = new URL(item.link || item.url || "");
          iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
        } catch {}
      } else if (item.source && typeof item.source === "object") {
        srcText = item.source.name || item.source.title || "";
        iconUrl = item.source.icon || null;
      }

      return (
        <motion.a
          key={i}
          href={item.link || item.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.05, 0.3) }}
          className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-sm hover:shadow-xl hover:bg-white/8 transition"
        >
          <div className="relative w-full h-40 bg-gray-900 overflow-hidden">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
                No image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div className="p-3 flex-1 flex flex-col min-h-[6rem]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {iconUrl && (
                <img src={iconUrl} alt={srcText} className="w-4 h-4 rounded" />
              )}
              <span className="truncate">{srcText}</span>
            </div>
            <h3 className="text-sm font-semibold leading-snug line-clamp-3">
              {item.title}
            </h3>
            <div className="mt-auto pt-3">
              <span className="inline-flex items-center gap-1 text-cyan-400 text-xs group-hover:gap-2 transition">
                Read{" "}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </span>
            </div>
          </div>
        </motion.a>
      );
    })}
  </div>
);

// In-app video modal used by VideoGrid and ShortVideoGrid
const InAppVideoModal = ({
  video,
  onClose,
}: {
  video: any | null;
  onClose: () => void;
}) => {
  if (!video) return null;

  // Determine embed src (prefer YouTube id if present)
  const getEmbedSrc = () => {
    if (video.id && typeof video.id === "string") {
      // youtube id
      return `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;
    }
    const url = video.url || video.link || "";
    try {
      const u = new URL(url);
      if (
        u.hostname.includes("youtube.com") ||
        u.hostname.includes("youtu.be")
      ) {
        // try to extract id
        const params = new URLSearchParams(u.search);
        const v = params.get("v");
        if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
        const paths = u.pathname.split("/").filter(Boolean);
        const last = paths[paths.length - 1];
        if (last)
          return `https://www.youtube.com/embed/${last}?autoplay=1&rel=0`;
      }
      // fallback to url (may be a direct video file)
      return url;
    } catch (e) {
      return video.url || video.link || "";
    }
  };

  const src = getEmbedSrc();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.url || video.link || "");
      toast({
        title: "Copied",
        description: "Video link copied to clipboard.",
      });
    } catch (e) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Framed player: keep the frame visually distinct */}
        <div className="bg-white/90 rounded-3xl p-4 shadow-2xl border border-white/10">
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            {src && src.startsWith("http") ? (
              <iframe
                title={video.title || "Video"}
                src={src}
                className="w-full aspect-video bg-black"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full aspect-video bg-black grid place-items-center text-sm text-muted-foreground">
                Cannot play this video
              </div>
            )}
          </div>
        </div>

        {/* X close button just outside the framed player */}
        <GlassyButton
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          ariaLabel="Close video"
          title="Close"
          className="absolute -top-4 -right-4 z-50 p-2 !px-2 !py-2"
        >
          <X size={16} />
        </GlassyButton>

        {/* External controls: title + actions outside the framed container */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-white truncate max-w-[60vw]">
              {video.title || video.name || "Video"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassyButton
              onClick={(e) => {
                e.stopPropagation();
                copyLink();
              }}
            >
              Copy link
            </GlassyButton>

            <GlassyButton
              href={video.url || video.link}
              onClick={(e) => e.stopPropagation()}
            >
              Open original
            </GlassyButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// VideoGrid Component — modern cards with in-app player
const VideoGrid = ({
  items,
}: {
  items: Array<{
    id?: string;
    url?: string;
    link?: string;
    title?: string;
    name?: string;
    snippet?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
  }>;
}) => {
  const [active, setActive] = React.useState<any | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((r, i) => {
          const thumb =
            r.thumbnail ||
            (r.id ? `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg` : null);
          const url = r.url || r.link || "";
          let domain = "";
          try {
            domain = new URL(url).hostname.replace(/^www\./, "");
          } catch {}
          const fav = domain
            ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
            : null;
          return (
            <motion.button
              key={r.id || r.url || i}
              onClick={() => setActive(r)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.25) }}
              className="group text-left overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-sm hover:shadow-xl hover:bg-white/8 transition"
            >
              <div className="relative w-full aspect-video bg-gray-900">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={r.title || r.name || "Video"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
                    No thumbnail
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="p-3 rounded-full bg-black/60 text-white shadow-lg">
                    <Play size={18} />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {fav && (
                    <img src={fav} alt={domain} className="w-4 h-4 rounded" />
                  )}
                  <span className="truncate">{domain}</span>
                </div>
                <h4 className="text-sm font-semibold line-clamp-2">
                  {r.title || r.name || "Video"}
                </h4>
                {(r.snippet || r.description || r.content) && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.snippet || r.description || r.content}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {active && (
          <InAppVideoModal video={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

// ShortVideoGrid Component — compact reels/cards
const ShortVideoGrid = ({
  items,
}: {
  items: Array<{
    id?: string;
    url?: string;
    link?: string;
    title?: string;
    name?: string;
    snippet?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
  }>;
}) => {
  const [active, setActive] = React.useState<any | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((r, i) => {
          const thumb =
            r.thumbnail ||
            (r.id ? `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg` : null);
          const url = r.url || r.link || "";
          let domain = "";
          try {
            domain = new URL(url).hostname.replace(/^www\./, "");
          } catch {}
          const fav = domain
            ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
            : null;
          return (
            <motion.button
              key={r.id || r.url || i}
              onClick={() => setActive(r)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.25) }}
              className="group text-left overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-sm hover:shadow-xl hover:bg-white/8 transition"
            >
              <div className="relative w-full aspect-[9/16] bg-gray-900">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={r.title || r.name || "Short"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
                    No thumbnail
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="p-3 rounded-full bg-black/60 text-white shadow-lg">
                    <Play size={18} />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {fav && (
                    <img src={fav} alt={domain} className="w-4 h-4 rounded" />
                  )}
                  <span className="truncate">{domain}</span>
                </div>
                <h4 className="text-sm font-semibold line-clamp-2">
                  {r.title || r.name || "Short"}
                </h4>
              </div>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {active && (
          <InAppVideoModal video={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

// SourcesList Component
const SourcesList = ({ links }: { links: Array<string> }) => (
  <ul className="text-sm text-gray-300 list-disc ml-4 space-y-1">
    {links.map((link, index) => (
      <li key={index}>
        <a
          href={link}
          className="text-cyan-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link}
        </a>
      </li>
    ))}
  </ul>
);

// ImageGallery Component — masonry layout + in-site lightbox with zoom/pan
const ImageGallery = ({ images }: { images: Array<string> }) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const dragging = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const pinchRef = React.useRef<number | null>(null);

  const close = () => setActiveIndex(null);
  const next = () =>
    setActiveIndex((i) => (i === null ? 0 : (i + 1) % images.length));
  const prev = () =>
    setActiveIndex((i) =>
      i === null ? 0 : (i - 1 + images.length) % images.length
    );

  // Reset zoom/pan when image changes or closes
  React.useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [activeIndex]);

  React.useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex]);

  // Preload adjacent images for smoother nav
  React.useEffect(() => {
    if (activeIndex === null) return;
    const nextIdx = (activeIndex + 1) % images.length;
    const prevIdx = (activeIndex - 1 + images.length) % images.length;
    const n = new Image();
    const p = new Image();
    n.src = images[nextIdx];
    p.src = images[prevIdx];
  }, [activeIndex, images]);

  return (
    <div className="w-full mt-4">
      {/* Masonry layout using CSS columns (true variable-height masonry) */}
      <div className="[column-width:140px] sm:[column-width:180px] md:[column-width:220px] lg:[column-width:260px] xl:[column-width:300px] [column-gap:12px]">
        {images.map((src, index) => {
          let domain = "";
          try {
            domain = new URL(src).hostname.replace(/^www\./, "");
          } catch (e) {
            domain = "";
          }
          const favicon = domain
            ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
            : null;

          return (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group block rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/60 mb-3 break-inside-avoid"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                whileHover={{ scale: 1.03 }}
                className="relative w-full bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-white/6"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Image ${index + 1}`}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* small overlay with favicon + domain */}
                <div className="absolute left-2 bottom-2 flex items-center gap-2 bg-black/45 backdrop-blur-sm px-2 py-1 rounded-full">
                  {favicon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favicon}
                      alt={domain}
                      className="w-4 h-4 rounded"
                    />
                  )}
                  <span className="text-xs text-white max-w-[7rem] truncate">
                    {domain || "Source"}
                  </span>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {/* Lightbox overlay */}
      {activeIndex !== null && images[activeIndex] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
        >
          {/* container to stop click propagation */}
          <div
            className="relative max-w-[92vw] max-h-[86vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - glassy */}
            <button
              onClick={close}
              className="absolute top-3 right-3 z-[81] p-2 rounded-full bg-black/60 hover:bg-black/70 text-white shadow-lg border border-white/10 backdrop-blur-md"
              aria-label="Close image viewer"
              title="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Prev / Next buttons (visible) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 z-[81] p-2 rounded-full bg-black/50 hover:bg-black/60 text-white shadow-lg border border-transparent backdrop-blur-md"
              aria-label="Previous image"
              title="Previous"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 z-[81] p-2 rounded-full bg-black/50 hover:bg-black/60 text-white shadow-lg border border-transparent backdrop-blur-md"
              aria-label="Next image"
              title="Next"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div
              className="relative max-w-full max-h-full overflow-hidden rounded-lg shadow-2xl"
              onWheel={(e) => {
                e.preventDefault();
                const delta = -e.deltaY;
                const factor = delta > 0 ? 1.12 : 0.88;
                setZoom((z) => Math.min(5, Math.max(1, z * factor)));
              }}
              onMouseDown={(e) => {
                dragging.current = true;
                last.current = { x: e.clientX, y: e.clientY };
              }}
              onMouseMove={(e) => {
                if (!dragging.current || zoom <= 1) return;
                const dx = e.clientX - last.current.x;
                const dy = e.clientY - last.current.y;
                last.current = { x: e.clientX, y: e.clientY };
                setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
              }}
              onMouseUp={() => (dragging.current = false)}
              onMouseLeave={() => (dragging.current = false)}
              onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  dragging.current = true;
                  last.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                  };
                } else if (e.touches.length === 2) {
                  // start pinch
                  const t0 = e.touches[0];
                  const t1 = e.touches[1];
                  const dx = t1.clientX - t0.clientX;
                  const dy = t1.clientY - t0.clientY;
                  pinchRef.current = Math.hypot(dx, dy);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 1 && dragging.current && zoom > 1) {
                  const x = e.touches[0].clientX;
                  const y = e.touches[0].clientY;
                  const dx = x - last.current.x;
                  const dy = y - last.current.y;
                  last.current = { x, y };
                  setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
                } else if (e.touches.length === 2) {
                  // pinch zoom
                  const t0 = e.touches[0];
                  const t1 = e.touches[1];
                  const dx = t1.clientX - t0.clientX;
                  const dy = t1.clientY - t0.clientY;
                  const dist = Math.hypot(dx, dy);
                  const lastDist = pinchRef.current || dist;
                  const factor = dist / lastDist;
                  setZoom((z) => Math.min(5, Math.max(1, z * factor)));
                  pinchRef.current = dist;
                }
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                dragging.current = false;
                if (e.touches.length < 2) pinchRef.current = null;
              }}
            >
              <motion.img
                key={images[activeIndex]}
                src={images[activeIndex]}
                alt={`Preview ${activeIndex + 1}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="max-w-[92vw] max-h-[80vh] object-contain select-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? "grab" : "auto",
                  touchAction: "none",
                }}
                draggable={false}
              />
            </div>

            {/* Footer: domain + open original */}
            {(() => {
              let d = "";
              try {
                d = new URL(images[activeIndex!]).hostname.replace(
                  /^www\./,
                  ""
                );
              } catch {}
              const fav = d
                ? `https://www.google.com/s2/favicons?sz=32&domain=${d}`
                : null;
              return (
                <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 bg-black/60 text-white px-2.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
                    {fav && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fav} alt={d} className="w-4 h-4 rounded" />
                    )}
                    <span className="text-white text-xs md:text-sm truncate max-w-[40vw]">
                      {d || "Image"}
                    </span>
                  </div>
                  <a
                    href={images[activeIndex!]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs md:text-sm text-white bg-black/60 hover:bg-black/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg"
                  >
                    Open original
                  </a>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}
    </div>
  );
};
