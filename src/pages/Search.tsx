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
  FlaskConical,
  Bot,
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
import { performSearch } from "@/services/searchService";
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
        setAnswer(data.summary || "Failed to summarize the webpage.");
        return;
      } catch (err) {
        console.error("❌ Browser agent error:", err);
        setAnswer("Something went wrong while processing the URL.");
        return;
      }
    }

    setLoading(true);
    setAnswer(null);
    setLivePartial("");

    try {
      console.log("Performing search for:", queryString);

      // Run agentic pipeline on Search page even when UI tab is 'search'
      const effectiveMode = searchMode === "search" ? "agentic" : searchMode;
      const result = await performSearch(queryString, effectiveMode);
      console.log("Search Result:", result);

      if (!result || !result.answer || !Array.isArray(result.results)) {
        throw new Error("Invalid response structure from performSearch.");
      }

      console.log("AI Answer:", result.answer);
      console.log("Sources:", result.results); // Log the sources to confirm they contain title, link, and snippet

      const isAgenticPipeline = effectiveMode === "agentic";
      setAnswer(
        isAgenticPipeline ? result.answer : formatAnswerText(result.answer)
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

      // Keep loader visible briefly so dynamic favicons can show
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
      setAnswer((found as any).answer || null);
      setSources((found as any).sources || []);
      setIsAnswerAnimating(false);
      return;
    }

    // Fallback: perform the search again if no cached answer
    setSearchTerm(query);
    if (mode) setSearchMode(mode);
    if (model) setSelectedModel(model);
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

  // Sources slide-over panel
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Nav/discover handlers removed

  return (
    <div className="flex h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background glow effect like in Hero section */}
      <div className="absolute inset-0 bg-hero-glow z-0"></div>

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
              <div className="max-h-72 overflow-auto">
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
      <div className="flex-1 flex flex-col md:pl-16 relative z-10">
        {/* Top right action bar removed per new UI spec */}

        {/* Content */}
        <div
          className="flex-1 p-8 overflow-y-auto"
          ref={(el) => {
            // assign ref for scroll tracking
            scrollContainerRef.current = el;
          }}
          onScroll={() => {
            // No-op here; real listener added in effect below to access latest answer
          }}
        >
          {/* --- Render main content or nested routes --- */}
          {location.pathname === "/search" ? (
            <div className="max-w-4xl mx-auto text-center">
              {" "}
              {/* Added text-center */}
              <h1 className="text-3xl font-bold mb-2">Nelieo</h1>
              <p className="text-muted-foreground mb-6">
                Ask questions, get research, or start a conversation
              </p>
              {/* Tabs */}
              <Tabs
                defaultValue="search"
                value={searchMode}
                onValueChange={(value) =>
                  setSearchMode(value as "search" | "chat" | "agentic")
                }
                className="mb-6"
              >
                <TabsList className="bg-muted p-1 rounded-md">
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

                {/* Search form - Responsive version */}
                <div className="mt-4 px-2 sm:px-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearchSubmit();
                    }}
                    className="relative mb-6 animate-fade-in"
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="relative max-w-2xl mx-auto">
                      <Input
                        type="text"
                        placeholder={
                          searchMode === "search"
                            ? "Search..."
                            : searchMode === "chat"
                            ? "Chat..."
                            : "Search..."
                        }
                        className="search-input h-12 sm:h-14 pl-10 sm:pl-12 pr-20 sm:pr-40 rounded-full border border-border placeholder:text-muted-foreground text-sm sm:text-base"
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
                        {/* AI Assistant Button - Hidden on smallest screens */}
                        <BrandedTooltip content="Launch AI Assistant">
                          <motion.button
                            onClick={() => navigate("/chat")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full transition shadow-sm backdrop-blur-md bg-white/6 hover:bg-white/10 border border-slate-200/20 dark:border-white/10"
                            title="Open Chat"
                          >
                            <AudioLines
                              className="animate-pulse text-slate-700 dark:text-slate-200"
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

                  {/* Perplexity-style, boxless loader with shimmer, reflection, and edge-faded ticker */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        className="relative mt-6 max-w-2xl mx-auto w-full"
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
                            style={{
                              color: theme === "light" ? "#6b7280" : "#d1d5db",
                            }}
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
                              animate={{
                                height: [8, 42, 10],
                                opacity: [0.6, 1, 0.75],
                              }}
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
                                    <FaviconImg
                                      domain={src.domain}
                                      alt={src.name}
                                    />
                                  ) : (
                                    <img
                                      src={src.logo}
                                      alt={src.name}
                                      className="w-5 h-5 object-contain rounded"
                                    />
                                  )}
                                  <span className="text-xs opacity-90">
                                    {src.name}
                                  </span>
                                </div>
                              ))}
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Search Suggestions - Mobile responsive */}
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative bg-card border border-border rounded-lg shadow-lg z-50 w-full max-w-2xl mx-auto"
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
                  {answer && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="answer-root mt-8 mb-6 max-w-4xl"
                    >
                      {/* Boxless answer layout: removed bg/border/shadow */}
                      <div className="px-2 py-4">
                        <div className="flex items-center mb-4 justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                searchMode === "search"
                                  ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                  : searchMode === "chat"
                                  ? "bg-gradient-to-r from-green-400 to-green-600"
                                  : "bg-gradient-to-r from-purple-400 to-purple-600"
                              } shadow-lg`}
                            ></div>
                            <h3 className="text-base font-semibold">
                              {searchMode === "search"
                                ? "Search Result"
                                : searchMode === "chat"
                                ? "Chat Response"
                                : "Research Analysis"}
                            </h3>
                          </div>

                          {/* Enhanced Action Buttons */}
                          <div className="flex gap-3 items-center">
                            <BrandedTooltip
                              content={
                                isPlaying ? "Stop Listening" : "Play Answer"
                              }
                            >
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() =>
                                  handlePlayToggle(answer || "", selectedLang)
                                }
                                className={
                                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-250 " +
                                  (isPlaying
                                    ? "bg-red-600/12 border border-red-400/10 text-red-300 shadow-sm"
                                    : "bg-white/6 backdrop-blur-sm border border-white/6 text-white shadow-md")
                                }
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
                                    className="text-red-400"
                                  >
                                    <rect
                                      x="6"
                                      y="6"
                                      width="12"
                                      height="12"
                                    ></rect>
                                  </svg>
                                ) : (
                                  <Play size={16} />
                                )}
                                <span className="hidden sm:inline">
                                  {isPlaying ? "Stop" : "Play"}
                                </span>
                              </motion.button>
                            </BrandedTooltip>

                            <BrandedTooltip content="Copy Answer">
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={async () => {
                                  try {
                                    if (!answer)
                                      throw new Error("No answer to copy");
                                    await navigator.clipboard.writeText(
                                      answer || ""
                                    );
                                    toast({
                                      title: "Copied",
                                      description:
                                        "Answer copied to clipboard.",
                                    });
                                  } catch (err) {
                                    console.error("Copy failed", err);
                                    toast({
                                      title: "Copy failed",
                                      description: "Unable to copy answer.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-white/6 border border-white/6 text-white hover:bg-white/8 transition"
                              >
                                <Copy size={16} />
                                <span className="hidden sm:inline">Copy</span>
                              </motion.button>
                            </BrandedTooltip>
                          </div>
                        </div>

                        <div className="prose max-w-none text-left">
                          {isAnswerAnimating ? (
                            <>
                              <StructuredAnswer
                                answerText={livePartial || ""}
                                sources={sources}
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
                            />
                          )}
                        </div>

                        {/* Sources (clickable) */}
                        {sources.length > 0 && (
                          <div className="mt-8 pt-6">
                            <h3 className="text-base font-bold text-white mb-4">
                              Sources
                            </h3>
                            <ul className="space-y-4 text-left text-sm text-muted-foreground">
                              {sources.map((src, i) => (
                                <li key={i}>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {src.title}
                                  </a>
                                  {src.snippet && (
                                    <p className="text-muted-foreground text-sm mt-1">
                                      {src.snippet}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action buttons section */}
                        {!isAnswerAnimating && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-wrap items-center gap-3 mt-8 pt-6"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              onClick={() => setSourcesOpen(true)}
                            >
                              <FileText size={16} />
                              <span>Sources</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              onClick={() => {
                                setSearchTerm(
                                  `Regarding "${searchTerm}", I'd like to know more about `
                                );
                                document.querySelector("input")?.focus();
                              }}
                            >
                              <MessageCircle size={16} />
                              <span>Ask follow-up</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            >
                              <FileText size={16} />
                              <span>Cite this</span>
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Sources:</h3>
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 bg-card border border-border rounded-lg"
                        >
                          <h4 className="font-medium mb-1">{result.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.content}
                          </p>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm hover:underline"
                          >
                            {result.url}
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personalized suggestions - redesigned as "Try questions like" */}
                {!answer && searchResults.length === 0 && (
                  <div
                    className="mt-8 animate-fade-in"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-center gap-3">
                      <p>Try questions like:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          "Latest AI advancements",
                          "Climate change solutions",
                          "Space exploration news",
                          "Quantum computing explained",
                        ].map((question, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-muted rounded-full cursor-pointer hover:bg-muted/80 transition-colors"
                            onClick={() => {
                              setSearchTerm(question);
                              handleSearch(question);
                            }}
                          >
                            {question}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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

// NewsPanel Component
const NewsPanel = ({
  news,
}: {
  news: Array<{ title: string; source: string; link: string }>;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {news.map((item, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="bg-white/5 rounded-xl p-4 shadow-lg"
      >
        <h3 className="text-white text-base font-bold">{item.title}</h3>
        <p className="text-gray-300 text-sm">{item.source}</p>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 text-sm mt-2 block"
        >
          Read
        </a>
      </motion.div>
    ))}
  </div>
);

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

// ImageGallery Component
const ImageGallery = ({ images }: { images: Array<string> }) => (
  <div className="relative w-full flex flex-wrap justify-center gap-4 md:gap-6 mt-4">
    {images.map((src, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{
          scale: 1.08,
          boxShadow: "0 0 25px rgba(139, 92, 246, 0.4)",
          borderColor: "rgba(139, 92, 246, 0.8)",
        }}
        className="relative w-[100px] h-[100px] md:w-[150px] md:h-[150px] rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm shadow-lg border border-white/10 transition-all duration-300"
      >
        <img
          src={src}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
          <span className="text-xs md:text-sm text-white font-medium px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            View {index + 1}
          </span>
        </div>
      </motion.div>
    ))}
  </div>
);
