// pages/Chat.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import DeepResearchCanvas from "@/components/DeepResearchCanvas";
import { useArsenal } from "../context/ArsenalContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Mic,
  AudioLines, // Added Audio icon
  BookOpenCheck,
  Search as SearchIcon,
  Layers3, // Added PanelRightOpen icon
  SendHorizonal,
  Camera,
  Edit,
  Send,
  Layers,
  Brain, // Importing Brain icon for Smart Research
  ArrowLeft,
  Plus, // For create new chat
  Compass,
  User,
  Trash,
  X,
  PanelRightOpen,
  Crown, // Use Crown icon for upgrade (professional/premium)
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Bot,
  Pin,
  Home,
  MoreVertical,
  Copy,
  Volume2,
  FileText,
  Check,
  Square,
  ArrowDown,
  Target,
  SquarePen, // Added Target icon for Focus Mode
  Settings,
  Eye,
  Info,
  Shield,
  FileText as FileTextIcon,
  LogOut,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";
import { Share } from "lucide-react";
import { BarChart3, PieChart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ChatSidebar from "@/components/ChatSidebar"; // or from same file if inline
import ChartRendererECharts from "@/components/ChartRendererECharts";
import FocusDashboard from "@/components/FocusDashboard"; // or wherever it's located
import TypingAnimation from "@/components/TypingAnimation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { autoChartPipeline } from "@/services/chartAutoService";
import { toast } from "@/hooks/use-toast";
import AILoader from "@/components/AILoader";
import ChartLoader from "@/components/ChartLoader";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        className="rounded-lg bg-card text-foreground px-2 py-1 text-xs font-medium shadow-lg animate-in fade-in zoom-in-95 border border-border max-w-xs"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Chat = () => {
  const navigate = useNavigate();
  type ChatMessage = { role: "user" | "ai"; content: string; chartData?: any };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const deepResearchEsRef = useRef<EventSource | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasStages, setCanvasStages] = useState<Array<any>>([]);
  const [canvasFullAnswer, setCanvasFullAnswer] = useState<string | null>(null);
  const [canvasSummary, setCanvasSummary] = useState<string | null>(null);
  const [canvasId, setCanvasId] = useState<string | null>(null); // backend canvas id for deep research
  const [canvasMetrics, setCanvasMetrics] = useState<any>(null);
  // Canvas association: only show canvas when viewing the chat that created it
  const [canvasAssociatedChatId, setCanvasAssociatedChatId] = useState<
    string | null
  >(null);
  const [mood, setMood] = useState<"neutral" | "happy" | "sad">("neutral");
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showSummarizeModal, setShowSummarizeModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  // Mobile profile panel state
  const [profileOpenMobile, setProfileOpenMobile] = useState(false);
  const profileBtnRefMobile = useRef<HTMLButtonElement | null>(null);
  const profilePanelRefMobile = useRef<HTMLDivElement | null>(null);
  const [showEmailMobile, setShowEmailMobile] = useState(false);
  const { theme, setTheme } = useTheme();
  // Quick history / inline edit state for chat overlay
  const [chatQuickOpen, setChatQuickOpen] = useState(false);
  const [chatQuickQuery, setChatQuickQuery] = useState("");
  const [editingChatIdLocal, setEditingChatIdLocal] = useState<string | null>(
    null
  );
  const [editingChatTitle, setEditingChatTitle] = useState("");

  const handleEditChat = (c: any) => {
    setEditingChatIdLocal(c.id);
    setEditingChatTitle(c.title || "");
  };

  const saveEditChat = async (c: any) => {
    try {
      if (c.id) {
        const d = doc(db, "chats", c.id);
        await updateDoc(d, {
          title: editingChatTitle,
          updatedAt: serverTimestamp(),
        });
      }
      setChatHistory((prev: any) =>
        prev.map((p: any) =>
          p.id === c.id ? { ...p, title: editingChatTitle } : p
        )
      );
      setEditingChatIdLocal(null);
      setEditingChatTitle("");
      toast({ title: "Saved", description: "Chat renamed." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to rename chat.",
        variant: "destructive",
      });
    }
  };

  const cancelEditChat = () => {
    setEditingChatIdLocal(null);
    setEditingChatTitle("");
  };
  const [showTools, setShowTools] = useState(false);
  const [showArsnel, setShowArsnel] = useState(false);
  const [activeArsenal, setActiveArsenal] = useState(false);
  const [activeSmartSearch, setActiveSmartSearch] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const userId = auth.currentUser?.uid;
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Track the index of the message being edited
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true); // State to control welcome message visibility
  const [loadingStage, setLoadingStage] = useState<
    "preparing" | "thinking" | null
  >(null); // Add a local loading stage state for animated loading
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);
  const [isNavPanelHovered, setIsNavPanelHovered] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"search" | "chat">(
    "chat"
  );
  const [isDiscoverPanelOpen, setIsDiscoverPanelOpen] = useState(false);
  const [isDiscoverPanelHovered, setIsDiscoverPanelHovered] = useState(false);
  const [isNavPanelPinned, setIsNavPanelPinned] = useState(false);
  const [isDiscoverPanelPinned, setIsDiscoverPanelPinned] = useState(false);
  const { config, instructions } = useArsenal();

  // Derived helper: true when the left nav/history panel is visible (hover/open/pinned)
  const isNavPanelVisible =
    ((isNavPanelHovered || isNavPanelOpen || isNavPanelPinned) &&
      !isDiscoverPanelOpen) ||
    (isNavPanelHovered &&
      typeof window !== "undefined" &&
      window.innerWidth < 768);
  // Any side panel visibility helper (either nav or discover)
  const isAnySidePanelVisible =
    isNavPanelVisible ||
    ((isDiscoverPanelHovered || isDiscoverPanelOpen || isDiscoverPanelPinned) &&
      !isNavPanelOpen &&
      !isNavPanelHovered);
  const navPanelTimeout = useRef<NodeJS.Timeout | null>(null);
  const discoverPanelTimeout = useRef<NodeJS.Timeout | null>(null);
  // For chat history menu: track which menu is open and if mouse is over menu
  const [chatHistoryMenuOpen, setChatHistoryMenuOpen] = useState<string | null>(
    null
  );
  const [chatHistoryMenuHover, setChatHistoryMenuHover] = useState<
    string | null
  >(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfContent, setPdfContent] = useState("");
  // Auto chart state
  const [autoChartResult, setAutoChartResult] = useState<any>(null);
  const [isAutoCharting, setIsAutoCharting] = useState(false);

  // Session management for chat continuity
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isNewChatSession, setIsNewChatSession] = useState(true);
  const [pdfStyle, setPdfStyle] = useState("normal");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [animatingMessageIndex, setAnimatingMessageIndex] = useState<
    number | null
  >(null);
  // When true, skip triggering typing animation on the next messages change (used for restored chats)
  const suppressNextAnimationRef = useRef(false);

  // Widget positions state
  const [widgetPositions, setWidgetPositions] = useState({
    timer: { x: 0, y: 0 },
    music: { x: 0, y: 120 },
    date: { x: 0, y: 240 },
  });

  // Show widgets on chat page after "Done"
  const [showWidgets, setShowWidgets] = useState(false);

  // Close tools panel when canvas opens and hide magic button while canvas is open
  useEffect(() => {
    if (canvasOpen) {
      setShowTools(false);
    }
  }, [canvasOpen]);

  // Handler for updating widget positions
  const handleWidgetDrag = (
    widget: "timer" | "music" | "date",
    data: { x: number; y: number }
  ) => {
    setWidgetPositions((prev) => ({
      ...prev,
      [widget]: { x: data.x, y: data.y },
    }));
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (deepResearchEsRef.current) {
        try {
          deepResearchEsRef.current.close();
        } catch {}
        deepResearchEsRef.current = null;
      }
    };
  }, []);

  // Function to save messages to Firestore
  // Updated saveToFirestore to handle session-based chats
  const saveToFirestore = async (userMessage: string, aiResponse: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.warn("❌ User not authenticated. Skipping save.");
      return;
    }

    console.log("💾 Saving to Firestore:", {
      userMessage: userMessage.substring(0, 50) + "...",
      isNewChatSession,
      currentChatId,
    });

    try {
      if (isNewChatSession || !currentChatId) {
        // Create a new chat session
        const chatTitle =
          userMessage.length > 50
            ? userMessage.substring(0, 50) + "..."
            : userMessage;

        console.log("🆕 Creating new chat session with title:", chatTitle);

        const docRef = await addDoc(collection(db, "chats"), {
          userId,
          title: chatTitle,
          messages: [
            { role: "user", content: userMessage, timestamp: new Date() },
            { role: "ai", content: aiResponse, timestamp: new Date() },
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setCurrentChatId(docRef.id);
        // Associate the created canvas with this new chat session
        setCanvasAssociatedChatId(docRef.id);
        setIsNewChatSession(false);
        console.log("✅ Created new chat session:", docRef.id);
      } else {
        // Update existing chat session with new messages
        const chatRef = doc(db, "chats", currentChatId);

        // Get current messages and add the new ones
        const updatedMessages = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          })),
          { role: "user", content: userMessage, timestamp: new Date() },
          { role: "ai", content: aiResponse, timestamp: new Date() },
        ];

        await updateDoc(chatRef, {
          messages: updatedMessages,
          updatedAt: serverTimestamp(),
        });
        // If we updated an existing chat, mark the canvas association to this chat
        if (currentChatId) setCanvasAssociatedChatId(currentChatId);
        console.log("✅ Updated existing chat session:", currentChatId);
      }
    } catch (error) {
      console.error("❌ Error saving to Firestore:", error);
    }
  };

  // Save deep research canvas separately so fullAnswer is stored as canvas field
  const saveCanvasToFirestore = async (
    userMessage: string,
    fullAnswer: string,
    summary?: string | null,
    metrics?: any,
    backendId?: string | null
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      if (isNewChatSession || !currentChatId) {
        const chatTitle =
          userMessage.length > 50
            ? userMessage.substring(0, 50) + "..."
            : userMessage;
        const docRef = await addDoc(collection(db, "chats"), {
          userId,
          title: chatTitle,
          messages: [
            { role: "user", content: userMessage, timestamp: new Date() },
            {
              role: "ai",
              content: summary || String(fullAnswer).slice(0, 400),
              timestamp: new Date(),
            },
          ],
          canvas: {
            id: backendId || canvasId || null,
            fullAnswer,
            summary: summary || String(fullAnswer).slice(0, 400),
            metrics: metrics || null,
            createdAt: serverTimestamp(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setCurrentChatId(docRef.id);
        setCanvasAssociatedChatId(docRef.id);
        setIsNewChatSession(false);
      } else {
        const chatRef = doc(db, "chats", currentChatId);
        const updatedMessages = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          })),
          { role: "user", content: userMessage, timestamp: new Date() },
          {
            role: "ai",
            content: summary || String(fullAnswer).slice(0, 400),
            timestamp: new Date(),
          },
        ];

        await updateDoc(chatRef, {
          messages: updatedMessages,
          canvas: {
            id: backendId || canvasId || null,
            fullAnswer,
            summary: summary || String(fullAnswer).slice(0, 400),
            metrics: metrics || null,
            createdAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });
        if (currentChatId) setCanvasAssociatedChatId(currentChatId);
      }
    } catch (err) {
      console.error("Failed to save canvas to Firestore:", err);
    }
  };

  // Deep Research SSE runner (returns a cleanup function)
  const runDeepResearchSSE = (userQuery: string) => {
    const params = new URLSearchParams({
      query: userQuery,
      depth: "phd",
      max_time: String(300),
      rounds: String(3),
      maxWeb: String(24),
      sources: "web,news,wikipedia,reddit,twitter,youtube,arxiv",
    });

    // Close previous if any
    if (deepResearchEsRef.current) {
      try {
        deepResearchEsRef.current.close();
      } catch {}
      deepResearchEsRef.current = null;
    }

    const es = new EventSource(
      `https://cognix-api.onrender.com/api/deepresearch/stream?${params.toString()}`
    );
    deepResearchEsRef.current = es;

    es.addEventListener("start", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setLoadingStage("preparing");
        // open canvas when deep research starts
        // Associate the canvas with the current chat session so it only shows there
        setCanvasAssociatedChatId(currentChatId);
        setCanvasOpen(true);
        setCanvasStages([]);
        setCanvasFullAnswer(null);
        setCanvasSummary(null);
        setCanvasMetrics(null);
      } catch {}
    });

    es.addEventListener("stage", (e: any) => {
      try {
        const d = JSON.parse(e.data);
        // Show human-friendly stage label
        setLoadingStage(d.stage || "thinking");
        setCanvasStages((prev) => [
          ...prev,
          { stage: d.stage || "step", payload: d },
        ]);
      } catch {}
    });

    es.addEventListener("metrics", (e: any) => {
      try {
        const m = JSON.parse(e.data); /* optionally use m for progress UI */
        setCanvasMetrics(m);
      } catch {}
    });

    // Capture backend-assigned canvas id
    es.addEventListener("canvas", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.id) setCanvasId(data.id);
      } catch {}
    });

    es.addEventListener("answer", async (e: any) => {
      try {
        const d = JSON.parse(e.data);
        const text = d.formatted_answer || d.answer || "(No answer)";
        // place full answer in canvas and push a short summary to chat
        setCanvasFullAnswer(text);
        const short = (d.formatted_answer || d.answer || "").slice(0, 400);
        setCanvasSummary(short);
        setCanvasStages((prev) => [
          ...prev,
          { stage: "final", payload: { summary: short } },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: short || "(No summary)",
            noAnimate: true,
          } as any,
        ]);
        try {
          // Persist the long full answer into the chat.document.canvas so it
          // will restore into the Canvas when the user reopens this chat.
          await saveCanvasToFirestore(
            userQuery,
            text,
            short,
            canvasMetrics,
            canvasId
          );
        } catch (err) {
          console.warn("Failed to save deep research canvas to Firestore", err);
        }
      } catch (err) {
        console.warn("Failed to parse deepresearch answer event", err);
      }
    });

    es.addEventListener("done", () => {
      try {
        es.close();
      } catch {}
      deepResearchEsRef.current = null;
      setIsLoading(false);
      setLoadingStage(null);
    });

    es.addEventListener("error", (e: any) => {
      try {
        const data = e.data ? JSON.parse(e.data) : null;
        if (data?.error) {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: `Deep Research error: ${data.error}` },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: "Deep Research failed." },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Deep Research failed (unknown error)." },
        ]);
      } finally {
        try {
          es.close();
        } catch {}
        deepResearchEsRef.current = null;
        setIsLoading(false);
        setLoadingStage(null);
      }
    });

    // Return cleanup
    return () => {
      try {
        es.close();
      } catch {}
      deepResearchEsRef.current = null;
    };
  };

  // Updated fetchChats to work with session-based chats
  const fetchChats = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log("❌ No user authenticated, skipping fetchChats");
      return;
    }

    console.log("🔄 Fetching chats for user:", userId);

    try {
      const q = query(
        collection(db, "chats"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      console.log("📊 Found", snapshot.docs.length, "chat documents");

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled Chat",
        messages: doc.data().messages || [],
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt,
        // For backward compatibility with old format
        question: doc.data().question,
        answer: doc.data().answer,
      }));

      console.log("📝 Processed chat data:", data);

      // Sort by updatedAt on the client side if it exists, otherwise by createdAt
      data.sort((a, b) => {
        const aTime =
          a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bTime =
          b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setChatHistory(data);
      console.log("✅ Chat history updated with", data.length, "items");
    } catch (error) {
      console.error("❌ Failed to fetch chat history:", error);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchChats]);

  // Close canvas when switching to a different chat that isn't associated
  useEffect(() => {
    if (
      canvasAssociatedChatId &&
      currentChatId &&
      canvasAssociatedChatId !== currentChatId
    ) {
      setCanvasOpen(false);
    }
  }, [canvasAssociatedChatId, currentChatId]);

  // Listen for authentication state changes and fetch chats when user is authenticated
  useEffect(() => {
    let scheduled: any = null;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🔐 User authenticated, fetching chats for:", user.uid);
        // Defer heavy fetch to idle time to avoid blocking first paint
        if ((window as any).requestIdleCallback) {
          scheduled = (window as any).requestIdleCallback(() => fetchChats(), {
            timeout: 200,
          });
        } else {
          scheduled = setTimeout(() => fetchChats(), 80);
        }
      } else {
        console.log("🚪 User signed out, clearing chat history");
        setChatHistory([]);
      }
    });

    return () => {
      unsubscribe();
      try {
        if (scheduled) {
          if ((window as any).cancelIdleCallback) {
            (window as any).cancelIdleCallback(scheduled);
          } else {
            clearTimeout(scheduled);
          }
        }
      } catch {}
    };
  }, [fetchChats]);

  // Update sendMessage to support chart detection and skip typing for charts
  const sendMessage = async () => {
    if (!input.trim()) return;
    setShowWelcomeMessage(false);
    // derive userId for backend scoping (Firebase first, then global fallback)
    const userId =
      auth?.currentUser?.uid || (window as any).__COGNIX_USER_ID__ || "demo";

    // Arsenal Mode short-circuit
    if (activeArsenal && config) {
      const userQuery = input;
      const newMessages = [
        ...messages,
        { role: "user" as const, content: userQuery },
      ];
      const historyToSend = newMessages.slice(-50).map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        content: m.content,
      }));
      setMessages(newMessages);
      setIsLoading(true);
      setInput("");
      try {
        // If deepResearch flag active, use SSE to stream progress & answer
        if (config.features?.deepResearch) {
          // push placeholder AI message that will be replaced by SSE answer
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: "Deep Research running...",
              noAnimate: true,
            } as any,
          ]);
          setLoadingStage("preparing");
          runDeepResearchSSE(userQuery);
          // cleanup will occur when SSE 'done' or on unmount
        } else {
          const RENDER_BASE =
            (window as any).__COGNIX_RENDER_BASE__ ||
            "https://cognix-api.onrender.com";

          // If specific Arsenal tools are enabled, call them individually
          const toolResults: Array<{ tool: string; answer: string | null }> =
            [];

          // Judge
          if (config.features?.judge) {
            try {
              const r = await fetch(`${RENDER_BASE}/api/judge`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": userId,
                },
                body: JSON.stringify({
                  query: userQuery,
                  history: historyToSend,
                }),
              });
              const j = await r.json();
              toolResults.push({ tool: "judge", answer: j.answer || null });
            } catch (e) {
              toolResults.push({ tool: "judge", answer: null });
            }
          }

          // Contrarian
          if (config.features?.contrarian) {
            try {
              const r = await fetch(`${RENDER_BASE}/api/contrarian`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": userId,
                },
                body: JSON.stringify({
                  query: userQuery,
                  history: historyToSend,
                }),
              });
              const c = await r.json();
              toolResults.push({
                tool: "contrarian",
                answer: c.answer || null,
              });
            } catch (e) {
              toolResults.push({ tool: "contrarian", answer: null });
            }
          }

          // If we called any tool-specific endpoints, merge their outputs into a combined message
          if (toolResults.length > 0) {
            const combined = toolResults
              .map(
                (t) =>
                  `=== ${t.tool.toUpperCase()} ===\n${t.answer || "(failed)"}`
              )
              .join("\n\n");
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: combined, noAnimate: true } as any,
            ]);
            try {
              await saveToFirestore(userQuery, combined);
            } catch (e) {
              console.warn("Failed to save Arsenal composite chat", e);
            }
          } else {
            // Fall back to existing /api/arsenal behavior
            try {
              const resp = await fetch(
                `${RENDER_BASE.replace(/\/$/, "")}/api/arsenal`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                  },
                  body: JSON.stringify({
                    query: userQuery,
                    arsenalConfig: { features: config.features },
                    history: historyToSend,
                  }),
                }
              );
              const json = await resp.json();
              setMessages((prev) => [
                ...prev,
                {
                  role: "ai",
                  content: json.formatted_answer || "(No answer)",
                  noAnimate: true,
                },
              ]);
              try {
                await saveToFirestore(
                  userQuery,
                  json.formatted_answer || json.answer || "(No answer)"
                );
              } catch (e) {
                console.warn("Failed to save Arsenal chat", e);
              }
            } catch (e) {
              setMessages((prev) => [
                ...prev,
                { role: "ai", content: "Arsenal failed." },
              ]);
            }
          }
        }
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Arsenal failed." },
        ]);
      } finally {
        // For SSE deep research we keep isLoading until 'done' event; otherwise clear now
        if (!config.features?.deepResearch) {
          setIsLoading(false);
          setLoadingStage(null);
        }
      }
      return;
    }

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(
      newMessages.map((msg) => ({
        role: msg.role as "user" | "ai",
        content: msg.content,
      }))
    );
    setIsLoading(true);
    setLoadingStage("preparing");
    setInput("");

    // Animate fake loading stages
    setTimeout(() => setLoadingStage("thinking"), 700);

    try {
      // If user explicitly asks to "make a video" or uses /video command, call backend video API
      const videoCommand =
        /(^\/video\b|make (me )?a video|create a video|generate a video)/i.test(
          input
        );

      if (videoCommand) {
        // show immediate acknowledgement
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: "Working on your cinematic video — hang tight!",
          },
        ]);

        try {
          const resp = await fetch("/api/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: input, lengthSeconds: 30 }),
          });
          // Robustly handle non-JSON or empty error bodies from dev proxy
          const ct = resp.headers.get("content-type") || "";
          let data: any = null;
          if (ct.includes("application/json")) {
            data = await resp.json();
          } else {
            const text = await resp.text();
            if (resp.ok) {
              try {
                data = JSON.parse(text);
              } catch {
                data = { status: "error", message: text || "Unknown response" };
              }
            } else {
              throw new Error(
                `Backend error ${resp.status} ${resp.statusText}${
                  text ? `: ${text}` : ""
                }`
              );
            }
          }
          if (data.videoUrl) {
            const url = data.videoUrl as string;
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content: JSON.stringify({
                  type: "video",
                  url,
                  demo: !!data.demo,
                }),
              },
            ]);
          } else if (data.status === "accepted") {
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content:
                  "Video generation accepted — processing in background. You will be notified when ready.",
              },
            ]);
          } else if (data.status === "spec") {
            // Show the spec to the user and offer download link
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content:
                  "I generated a production-ready video spec. Open developer console or check the API response to access it.",
              },
            ]);
            console.log("video spec:", data.spec);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content: "Could not generate a video at this time.",
              },
            ]);
            console.warn("generate-video response:", data);
          }
        } catch (e) {
          console.error("Video request failed:", e);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: "Video request failed. See console for details.",
            },
          ]);
        }

        setInput("");
        setIsLoading(false);
        setLoadingStage(null);
        return;
      }

      // Check for market research intent with improved regex
      const marketResearchMatch = input.match(
        /market research.*?on (.+?) (and|&) (email|send).*? at (.+@.+\..+)/i
      );

      if (marketResearchMatch) {
        const topic = marketResearchMatch[1].trim();
        const email = marketResearchMatch[4].trim();

        const res = await fetch(
          "https://cognix-api.onrender.com/api/agent-research",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: topic, email }),
          }
        );

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content:
              data.message ||
              "Report is being generated and will be sent via email.",
          },
        ]);

        setInput(""); // Clear the input bar
        return;
      }

      // Check for time machine prompt
      const isTimeMachinePrompt =
        /take me back to|show me .* (events|earnings|news|stocks)/i.test(input);

      if (isTimeMachinePrompt) {
        const yearMatch = input.match(/(\d{4})/);
        const year = yearMatch?.[1];
        const topic = input
          .replace(/take me back to|show me|in \d{4}/gi, "")
          .trim();

        const res = await fetch(
          "https://cognix-api.onrender.com/api/time-machine",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, topic }),
          }
        );

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.data || "Couldn't simulate that time.",
          },
        ]);

        return;
      }

      // STEP 1: Detect if chart is likely needed
      const needsChart =
        /chart|compare|trend|sales|growth|distribution|visual/i.test(input);

      const isNaturalChart =
        /make|show|plot|build|create/i.test(input) &&
        /chart|graph|data|%|percent|compare|distribution/i.test(input);

      const naturalPrompt = `
      The user wants to create a chart from their text. Read the message and convert it to clean JSON.

      Example input: "Make a pie chart: Apple 40%, Google 35%, Microsoft 25%"

      Output format:
      {
        "chartType": "pie",
        "labels": ["Apple", "Google", "Microsoft"],
        "values": [40, 35, 25]
      }

      Do not return any explanation or markdown. Just clean JSON.
      Message: ${input}
      `;

      // STEP 2: Inject the special Gemini instruction
      const chartInstruction = `
You are an expert data visualization AI. When given a prompt like:
"Show a bar chart comparing India, USA, and UK GDP"

✅ You must:
1. Identify chart type (bar, line, pie, etc.)
2. Extract labels (like "India", "USA", "UK")
3. 🔥 ALWAYS guess realistic values — even if not provided. You must never return empty arrays.
4. You may assume general knowledge like:
- India GDP ≈ 3.7T
- USA GDP ≈ 25.5T
- UK GDP ≈ 3.2T

🎯 Output ONLY clean JSON like:

{
  "chartType": "bar",
  "labels": ["India", "USA", "UK"],
  "values": [3.7, 25.5, 3.2]
}

🚫 DO NOT return explanations  
🚫 DO NOT return markdown  
🚫 DO NOT return backticks  
✅ Return just valid JSON
`;

      const finalPrompt = isNaturalChart
        ? naturalPrompt
        : needsChart
        ? `${chartInstruction}\n\n${input}`
        : input;

      // Include recent history and currentChatId so the server can maintain multi-turn context
      const historyToSend = newMessages.slice(-50).map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        content: m.content,
      }));

      const response = await fetch("https://cognix-api.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId || (window as any).__COGNIX_USER_ID__ || "demo",
        },
        body: JSON.stringify({
          query: finalPrompt,
          raw: input,
          history: historyToSend,
          chatId: currentChatId,
        }),
      });

      const data = await response.json();
      if (!data.reply) throw new Error("No reply received from AI.");

      const sanitizedReply = data.reply
        .replace(/[*_#]/g, "")
        .replace(/```/g, "");

      // Chart detection before typing effect
      try {
        const parsed = JSON.parse(sanitizedReply);
        if (
          parsed.chartType &&
          Array.isArray(parsed.labels) &&
          Array.isArray(parsed.values)
        ) {
          const newMessageIndex = newMessages.length;
          setMessages([
            ...newMessages.map((msg) => ({
              role: msg.role as "user" | "ai",
              content: msg.content,
            })),
            { role: "ai" as "ai", content: "chart", chartData: parsed },
          ]);
          // Charts don't need typing animation
          setAnimatingMessageIndex(null);

          setIsLoading(false);
          setLoadingStage(null);
          await saveToFirestore(input, "[Chart]");
          fetchChats();
          return;
        }
      } catch (e) {
        // Not JSON, continue
      }

      // No typing effect, just set the message
      const newMessageIndex = newMessages.length;
      setMessages([
        ...newMessages.map((msg) => ({
          role: msg.role as "user" | "ai",
          content: msg.content,
        })),
        { role: "ai" as "user" | "ai", content: sanitizedReply },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);

      await saveToFirestore(input, sanitizedReply);
      fetchChats();
      if (/happy|great|awesome|yay|fantastic|love/i.test(sanitizedReply)) {
        setMood("happy");
      } else if (/sad|bad|depressed|upset|sorry/i.test(sanitizedReply)) {
        setMood("sad");
      } else {
        setMood("neutral");
      }
    } catch (err) {
      console.error("❌ Chat error:", err);
      const newMessageIndex = newMessages.length;
      setMessages([
        ...newMessages.map((msg) => ({
          role: msg.role as "user" | "ai",
          content: msg.content,
        })),
        { role: "ai", content: "Something went wrong." },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);
    } finally {
      setLoadingStage(null);
      setIsLoading(false);
    }
  }; // Closing brace for sendMessage function

  const handleMicClick = () => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setInput(spokenText);
    };
    recognition.onerror = (event: any) =>
      console.error("Speech recognition error", event.error);

    recognition.start();
  };

  const SummarizeModal = ({ open, onClose, onSubmit }: any) => {
    const [textToSummarize, setTextToSummarize] = useState("");

    const handleSubmit = () => {
      if (textToSummarize.trim()) {
        onSubmit(textToSummarize);
        setTextToSummarize("");
        onClose();
      }
    };

    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 32 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card backdrop-blur-xl border border-border p-6 rounded-2xl w-full max-w-xl shadow-xl text-foreground"
        >
          <h2 className="text-xl font-semibold mb-3">Summarize This Text</h2>
          <textarea
            rows={8}
            className="w-full p-3 rounded-lg bg-muted border border-border placeholder:text-muted-foreground text-foreground focus:outline-none resize-none"
            placeholder="Paste content here..."
            value={textToSummarize}
            onChange={(e) => setTextToSummarize(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="bg-muted px-4 py-2 rounded-lg hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg"
            >
              Summarize
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const ResearchModal = ({ open, onClose, onSubmit }: any) => {
    const [researchTopic, setResearchTopic] = useState("");

    const handleSubmit = () => {
      if (researchTopic.trim()) {
        onSubmit(researchTopic);
        setResearchTopic("");
        onClose();
      }
    };

    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 32 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card backdrop-blur-xl border border-border p-6 rounded-2xl w-full max-w-xl shadow-xl text-foreground"
        >
          <h2 className="text-xl font-semibold mb-3">Start a Deep Research</h2>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-muted border border-border placeholder:text-muted-foreground text-foreground focus:outline-none"
            placeholder="e.g., Impact of AI on healthcare"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="bg-muted px-4 py-2 rounded-lg hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg"
            >
              Start
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const startResearch = async (topic: string) => {
    const newMessages = [
      ...messages,
      { role: "user", content: `Please research: ${topic}` },
    ];
    setMessages(
      newMessages.map((msg) => ({
        role: msg.role as "user" | "ai",
        content: msg.content,
      }))
    );
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://cognix-api.onrender.com/api/research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: topic }),
        }
      );

      const data = await response.json();
      const newMessageIndex = newMessages.length;
      setMessages([
        ...newMessages.map((msg) => ({
          role: msg.role as "user" | "ai",
          content: msg.content,
        })),
        {
          role: "ai" as "ai",
          content: data.result || "Sorry, failed to research.",
        },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);

      await saveToFirestore(topic, data.result || "Sorry, failed to research"); // Save to Firestore
    } catch (err) {
      console.error("❌ Research error:", err);
      const newMessageIndex = newMessages.length;
      setMessages([
        ...newMessages.map((msg) => ({
          role: msg.role as "user" | "ai",
          content: msg.content,
        })),
        { role: "ai", content: "Something went wrong during research." },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-chart handler: tries to build a chart from natural language query
  const handleAutoChart = async (query: string) => {
    const q = (query || input || "").trim();
    if (!q) {
      toast({
        title: "Enter a prompt",
        description: "Type what to chart.",
        variant: "destructive",
      });
      return;
    }
    setIsAutoCharting(true);
    try {
      const result = await autoChartPipeline(q);
      if (result?.error) {
        toast({
          title: "Chart failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      // Enable realtime updates by default using agentic-v2 extractor
      const realtimeConfig = {
        realtime: true,
        topic: q,
        realtimeInterval: 60000,
        payload: { topic: q, chart_type: result.chartType || "line" },
      };
      setAutoChartResult({
        ...result,
        data: { ...(result.data || {}), ...realtimeConfig },
      });
      // Inject as an AI chart message
      setMessages((prev) => [
        ...prev,
        {
          role: "ai" as const,
          content: "chart",
          chartData: {
            chartType: result.chartType,
            labels: result.labels,
            values: result.values,
            data: realtimeConfig,
          },
        },
      ]);
      // Persist minimal entry
      try {
        await saveToFirestore(q, "[AutoChart]");
      } catch {}
    } catch (err: any) {
      toast({
        title: "Chart error",
        description: err?.message || "Failed to generate chart.",
        variant: "destructive",
      });
    } finally {
      setIsAutoCharting(false);
    }
  };

  const handleSummarize = async (text: string) => {
    const newMessages = [
      ...messages,
      { role: "user", content: `Please summarize this:` },
    ];
    setMessages(
      newMessages.map((msg) => ({
        role: msg.role as "user" | "ai",
        content: msg.content,
      }))
    );
    setIsLoading(true);

    const response = await fetch(
      "https://cognix-api.onrender.com/api/summarize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      }
    );

    const data = await response.json();
    const newMessageIndex = newMessages.length;
    setMessages([
      ...newMessages.map((msg) => ({
        role: msg.role as "user" | "ai",
        content: msg.content,
      })),
      { role: "ai", content: data.result || "Failed to summarize." },
    ]);
    // Set this message as animating
    setAnimatingMessageIndex(newMessageIndex);

    setIsLoading(false);
  };

  const handleStartNewChat = () => {
    setMessages([]); // Clear the messages in UI
    setAnimatingMessageIndex(null); // Reset animation state
    setCurrentChatId(null); // Clear current chat ID
    setIsNewChatSession(true); // Mark as new chat session
    setShowWelcomeMessage(true); // Show welcome message again
    const el = document.getElementById("chatWindow");
    if (el) el.scrollTo({ top: 0, behavior: "smooth" }); // Scroll chat view to top
  };

  // Initialize as a new chat session when the page is opened
  useEffect(() => {
    setMessages([]);
    setAnimatingMessageIndex(null);
    setCurrentChatId(null);
    setIsNewChatSession(true);
    setShowWelcomeMessage(true);
  }, []);

  // Set animating message index when messages change
  useEffect(() => {
    // When a new message is added and it's from AI, animate it
    if (suppressNextAnimationRef.current) {
      // Skip one cycle of animation (restored session load)
      suppressNextAnimationRef.current = false;
      return;
    }
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const lastIndex = messages.length - 1;

      console.log(
        "Messages changed. Last message role:",
        lastMessage.role,
        "Index:",
        lastIndex
      );
      console.log("Current animatingMessageIndex:", animatingMessageIndex);

      if (lastMessage.role === "ai") {
        console.log("Setting animation index to:", lastIndex);
        // Use a short delay to ensure the component has rendered
        setTimeout(() => {
          setAnimatingMessageIndex(lastIndex);
        }, 100);
      }
    }
  }, [messages]);

  // Listen for authentication state changes and fetch chats when user is authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🔐 User authenticated, fetching chats for:", user.uid);
        fetchChats();
      } else {
        console.log("🚪 User signed out, clearing chat history");
        setChatHistory([]);
      }
    });

    return () => unsubscribe();
  }, [fetchChats]);

  const editMessage = async (index: number, newContent: string) => {
    const updatedMessages = [...messages];
    updatedMessages[index].content = newContent; // Update the user message
    setMessages(updatedMessages);

    // Remove the old AI response
    const aiResponseIndex = updatedMessages.findIndex(
      (msg, i) => i > index && msg.role === "ai"
    );
    if (aiResponseIndex !== -1) {
      updatedMessages.splice(aiResponseIndex, 1);
      setMessages(updatedMessages);
    }

    // Trigger a new AI response
    try {
      const response = await fetch("https://cognix-api.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id":
            auth?.currentUser?.uid ||
            (window as any).__COGNIX_USER_ID__ ||
            "demo",
        },
        body: JSON.stringify({
          query: newContent,
          raw: newContent,
          history: updatedMessages.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            content: msg.content,
          })),
        }),
      });

      const data = await response.json();
      if (!data.reply) throw new Error("No reply received from AI.");

      const sanitizedReply = data.reply.replace(/[*#_`]/g, "");
      const newMessageIndex = updatedMessages.length;
      setMessages([
        ...updatedMessages,
        { role: "ai", content: sanitizedReply },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);
    } catch (err) {
      console.error("❌ Edit error:", err);
      const newMessageIndex = updatedMessages.length;
      setMessages([
        ...updatedMessages,
        { role: "ai", content: "Something went wrong." },
      ]);
      // Set this message as animating
      setAnimatingMessageIndex(newMessageIndex);
    } finally {
      setEditingIndex(null); // Reset editing state
    }
  };

  const convertMarkdownToTable = (markdown: string) => {
    const rows = markdown
      .trim()
      .split("\n")
      .filter((line) => line.includes("|"));
    if (rows.length < 2) return markdown;

    const headers = rows[0]
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    const dataRows = rows.slice(2).map((row) =>
      row
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    );

    const tableHTML = `
      <table class="min-w-full text-foreground border border-border rounded-xl">
        <thead class="bg-muted">
          <tr>${headers
            .map(
              (h) => `<th class="px-4 py-2 border-b border-border">${h}</th>`
            )
            .join("")}</tr>
        </thead>
        <tbody>
          ${dataRows
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (cell) =>
                      `<td class="px-4 py-2 border-t border-border">${cell}</td>`
                  )
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    return tableHTML;
  };

  useEffect(() => {
    const preload = sessionStorage.getItem("chatInput");
    if (preload) {
      setInput(preload);
      // Defer sending to next frame to avoid blocking initial paint
      requestAnimationFrame(() => sendMessage());
      sessionStorage.removeItem("chatInput");
    }
  }, []);

  // Handlers for navbar hover
  const handleNavMouseEnter = (e?: React.MouseEvent) => {
    // If discover is being hovered/pinned, don't open the nav panel
    if (isDiscoverPanelHovered || isDiscoverPanelPinned) return;
    if (e && (e.target as HTMLElement).closest("[data-discover-nav]")) {
      return;
    }
    if (navPanelTimeout.current) clearTimeout(navPanelTimeout.current);
    // Use a separate hovered state so hovering doesn't trigger layout transforms
    if (!isNavPanelPinned) setIsNavPanelHovered(true);
  };
  const handleNavMouseLeave = () => {
    if (!isNavPanelPinned) {
      navPanelTimeout.current = setTimeout(
        () => setIsNavPanelHovered(false),
        120
      );
    }
  };

  // Handlers for Discover hover
  const handleDiscoverMouseEnter = () => {
    if (discoverPanelTimeout.current)
      clearTimeout(discoverPanelTimeout.current);
    // Use hover-only state so hovering doesn't trigger main layout transforms
    if (!isDiscoverPanelPinned) setIsDiscoverPanelHovered(true);
    // Keep nav closed when discover is being hovered/opened and clear nav hover
    setIsNavPanelHovered(false);
    setIsNavPanelOpen(false);
  };
  const handleDiscoverMouseLeave = () => {
    if (!isDiscoverPanelPinned) {
      discoverPanelTimeout.current = setTimeout(
        () => setIsDiscoverPanelHovered(false),
        120
      );
    }
  };

  // Handler for deleting a chat
  const handleDeleteChat = async (chatId: string) => {
    try {
      // Remove from Firestore
      await import("firebase/firestore").then(async ({ deleteDoc, doc }) => {
        await deleteDoc(doc(db, "chats", chatId));
      });
      // Remove from local state
      setChatHistory((prev: any) => prev.filter((c: any) => c.id !== chatId));
      setChatHistoryMenuOpen(null);
    } catch (e) {
      // Optionally show error
      console.error("Failed to delete chat:", e);
    }
  };

  // Open a chat (used by sidebar and quick overlay)
  const openChat = async (chat: any) => {
    try {
      // Handle both new format (messages array) and old format (question/answer)
      if (chat.messages && Array.isArray(chat.messages)) {
        suppressNextAnimationRef.current = true; // prevent retyping on restore
        setMessages(
          chat.messages.map((msg: any) => ({
            role: msg.role as "user" | "ai",
            content: msg.content,
          }))
        );
        setCurrentChatId(chat.id);
        setIsNewChatSession(false);
        // Restore canvas if present
        if (chat.canvas && chat.canvas.fullAnswer) {
          setCanvasFullAnswer(chat.canvas.fullAnswer);
          setCanvasSummary(chat.canvas.summary || null);
          setCanvasMetrics(chat.canvas.metrics || null);
          setCanvasId(chat.canvas.id || null);
          setCanvasAssociatedChatId(chat.id);
          setCanvasOpen(true);
        } else {
          setCanvasFullAnswer(null);
          setCanvasSummary(null);
          setCanvasMetrics(null);
          setCanvasId(null);
          if (canvasAssociatedChatId === chat.id)
            setCanvasAssociatedChatId(null);
        }
      } else if (chat.question && chat.answer) {
        // Old format: backward compatibility
        setMessages([
          { role: "user", content: chat.question },
          { role: "ai", content: chat.answer },
        ]);
        setCurrentChatId(null);
        setIsNewChatSession(true);
      }
      setAnimatingMessageIndex(null); // No animation for restored messages
      setShowWelcomeMessage(false);
      setSidebarOpen(false);
      setChatQuickOpen(false);
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  };

  const speakText = (text: string) => {
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const openPdfModal = (content: string) => {
    setPdfContent(content);
    setShowPdfModal(true);
  };

  const handlePdfGenerate = async (text: string) => {
    const res = await fetch(
      "https://cognix-api.onrender.com/api/convert-to-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, style: "mckinsey" }),
      }
    );

    if (!res.ok) {
      alert("❌ Failed to generate PDF");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Cognix-Report.pdf";
    a.click();
  };

  // Helper to convert answerBlocks to plain text for copy
  function answerBlocksToText(blocks: any[]): string {
    return blocks
      .map((block) => {
        switch (block.type) {
          case "heading":
            return `${block.content}\n`;
          case "paragraph":
            return `${block.content}\n`;
          case "image":
            return block.url ? `[Image: ${block.url}]\n` : "";
          case "chart":
            return block.labels && block.values
              ? `Chart (${block.chartType}):\n${block.labels
                  .map(
                    (label: string, i: number) => `${label}: ${block.values[i]}`
                  )
                  .join(", ")}\n`
              : "";
          case "table":
            return (
              block.headers.join("\t") +
              "\n" +
              block.rows.map((row: string[]) => row.join("\t")).join("\n") +
              "\n"
            );
          default:
            return "";
        }
      })
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Stop speech synthesis
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  };

  // Helper to get a realistic human-like voice, prefer Microsoft Ava
  function getBestHumanVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Prefer Microsoft Ava (en-US)
    const ava = voices.find(
      (v) =>
        /microsoft.*ava/i.test(v.name) && v.lang.toLowerCase().startsWith("en")
    );
    if (ava) return ava;
    // Try to find a Google/Wavenet/Neural/Enhanced voice first
    const preferred = voices.find(
      (v) =>
        /google|wavenet|neural|enhanced/i.test(v.name) &&
        v.lang.startsWith("en")
    );
    if (preferred) return preferred;
    // Fallback to a high-quality English voice
    const enVoice = voices.find(
      (v) => v.lang.startsWith("en") && v.localService
    );
    if (enVoice) return enVoice;
    // Fallback to any English voice
    return voices.find((v) => v.lang.startsWith("en")) || voices[0];
  }

  // Show/hide scroll down button logic with throttling for smoother performance
  useEffect(() => {
    const chatDiv = chatContainerRef.current;
    if (!chatDiv) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Show if not at bottom (with 40px leeway)
          setShowScrollDown(
            chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight > 40
          );
          ticking = false;
        });
        ticking = true;
      }
    };

    chatDiv.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => chatDiv.removeEventListener("scroll", handleScroll);
  }, [messages]);

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const start = el.scrollTop;
    const end = el.scrollHeight - el.clientHeight;
    const delta = end - start;
    if (Math.abs(delta) < 2) return;
    const duration = 480; // ms
    let startTime: number | null = null;
    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }
    function step(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      el.scrollTop = Math.round(start + delta * eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // ensure final position and focus input for convenience
        el.scrollTop = end;
        try {
          inputRef.current?.focus();
        } catch {}
      }
    }
    requestAnimationFrame(step);
  };

  // Auto-resize chat input textarea on content change
  const autoResizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    // schedule resize in rAF to avoid layout thrash during typing
    if ((autoResizeInput as any)._raf)
      cancelAnimationFrame((autoResizeInput as any)._raf);
    (autoResizeInput as any)._raf = requestAnimationFrame(() => {
      const min = 44; // px
      const max = 192; // px ~ 12rem
      // temporarily reset to get accurate scrollHeight
      el.style.height = "0px";
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    });
  }, []);

  useEffect(() => {
    autoResizeInput();
  }, [input, autoResizeInput]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative h-screen overflow-hidden bg-white dark:bg-[#1e1e1e] text-foreground"
    >
      {/* Left navbar removed for simplified chat layout */}

      {/* Mobile Header: Centered CogniX, hamburger for nav, no profile/panel */}
      {!(
        typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        isNavPanelOpen
      ) && (
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-gray-200/10 dark:border-gray-700/20 flex items-center justify-between px-3 py-2"
          style={{
            backgroundColor: "transparent",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          {/* Mobile: replace hamburger with Search icon to open chat history */}
          <button
            className="flex items-center justify-center h-9 w-9"
            onClick={() => setChatQuickOpen(true)}
            aria-label="Open chat history"
            title="Open chat history"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
          {/* Centered small title (slightly reduced on mobile) */}
          <div className="flex items-center gap-2">
            {/* Right-side: Square pen button to start a new chat on mobile */}
            <button
              className="flex items-center justify-center h-9 w-9"
              onClick={() => handleStartNewChat()}
              aria-label="Start new chat"
              title="Start new chat"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-white/6 backdrop-blur-md border border-white/10">
                <SquarePen className="w-4 h-4 text-foreground" />
              </span>
            </button>
            {/* Mobile profile button */}
            <button
              ref={profileBtnRefMobile}
              className="flex items-center justify-center h-9 w-9"
              onClick={() => setProfileOpenMobile((v) => !v)}
              aria-label="Open profile"
              title="Profile"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white border border-white/20 overflow-hidden">
                {auth.currentUser?.photoURL ? (
                  <img
                    src={auth.currentUser.photoURL}
                    alt={
                      auth.currentUser.displayName ||
                      auth.currentUser.email ||
                      "Profile"
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </span>
            </button>
          </div>
        </div>
      )}
      {!(
        typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        isNavPanelOpen
      ) && (
        <div className="md:hidden fixed top-[56px] left-0 right-0 z-40 border-b border-gray-200/10 dark:border-gray-700/20" />
      )}

      {/* Chat Quick History Overlay (top-left panel) */}
      <AnimatePresence>
        {profileOpenMobile && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            ref={profilePanelRefMobile}
            className="fixed top-16 right-3 w-64 rounded-xl bg-background/95 backdrop-blur-xl shadow-2xl z-[70] overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3 border-b border-border/40">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">
                  User
                </div>

                {/* Advisory: small note telling users to crosscheck AI answers */}
                <div className="text-xs text-muted-foreground mt-2 px-1">
                  Nelieo may occasionally make mistakes — please cross-check
                  critical information before acting on it.
                </div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                  <span className="truncate">
                    {showEmailMobile
                      ? auth.currentUser?.email
                      : auth.currentUser?.email?.replace(
                          /(^.{3})(.*)(@.*)$/,
                          (m, a, b, c) => `${a}${"•".repeat(3)}${c}`
                        )}
                  </span>
                  <button
                    onClick={() => setShowEmailMobile((v) => !v)}
                    className="p-1 rounded hover:bg-white/5"
                  >
                    <Eye className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>
            </div>
            <div className="py-2 text-sm">
              <button
                onClick={() => {
                  setProfileOpenMobile(false);
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
                  setProfileOpenMobile(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-left text-red-400"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
        {chatQuickOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-[70] flex items-start justify-center p-6"
          >
            {/* layered frosted backdrop to match Search quick history */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/3 via-transparent to-white/4 backdrop-blur-xl" />
            <div className="w-full max-w-2xl bg-background/30 backdrop-blur-2xl rounded-lg overflow-hidden shadow-2xl border border-white/10">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <SearchIcon size={16} />
                <input
                  value={chatQuickQuery}
                  onChange={(e) => setChatQuickQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="flex-1 bg-transparent outline-none px-2 py-2 text-sm"
                />
                <button
                  className="text-sm text-muted-foreground px-2 py-1"
                  onClick={() => setChatQuickOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 py-3 text-xs text-muted-foreground">
                Recent chats
              </div>
              <div className="max-h-72 overflow-auto">
                {(chatHistory || [])
                  .filter((h: any) =>
                    (h.title || "")
                      .toLowerCase()
                      .includes(chatQuickQuery.toLowerCase())
                  )
                  .map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => openChat(item)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-t border-white/5 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <div className="flex-1 text-sm truncate">
                        {editingChatIdLocal === item.id ? (
                          <input
                            value={editingChatTitle}
                            onChange={(e) =>
                              setEditingChatTitle(e.target.value)
                            }
                            className="w-full bg-transparent outline-none text-sm"
                          />
                        ) : (
                          item.title || "Untitled Chat"
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingChatIdLocal === item.id ? (
                          <>
                            <button
                              title="Save"
                              onClick={() => saveEditChat(item)}
                              className="text-foreground p-1"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              title="Cancel"
                              onClick={cancelEditChat}
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
                                handleEditChat(item);
                              }}
                              className="text-muted-foreground p-1"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(item.id);
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

      {/* Top-left quick history button removed; header title moved to left corner */}

      {/* Left slide panels removed for Chat page */}

      {/* Discover Slide-out Panel */}
      <motion.div
        initial={false}
        animate={{
          // Show when hovered, open, or pinned. Main chat transform remains tied to open/pinned state
          x:
            isDiscoverPanelHovered ||
            isDiscoverPanelOpen ||
            isDiscoverPanelPinned
              ? 0
              : -240,
          opacity:
            isDiscoverPanelHovered ||
            isDiscoverPanelOpen ||
            isDiscoverPanelPinned
              ? 1
              : 0,
          pointerEvents:
            isDiscoverPanelHovered ||
            isDiscoverPanelOpen ||
            isDiscoverPanelPinned
              ? "auto"
              : "none",
        }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="hidden md:block fixed top-0 left-16 h-full w-64 rounded-r-2xl border-r border-transparent z-[60] bg-transparent smooth-panel"
        style={{ backgroundColor: "transparent" }}
        onMouseEnter={(e) => {
          handleDiscoverMouseEnter();
          if (!isDiscoverPanelPinned) setIsDiscoverPanelHovered(true);
        }}
        onMouseLeave={() => {
          handleDiscoverMouseLeave();
          if (!isDiscoverPanelPinned) setIsDiscoverPanelHovered(false);
        }}
      >
        <div className="flex flex-col h-full py-6 px-4 gap-3 text-foreground">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-base font-semibold text-foreground flex-1">
              Discover
            </h2>
            {/* Pin icon for Discover */}
            <BrandedTooltip
              content={isDiscoverPanelPinned ? "Unpin Panel" : "Pin Panel"}
            >
              <Pin
                className={`w-3.5 h-3.5 cursor-pointer transition-colors ${
                  isDiscoverPanelPinned
                    ? "stroke-primary"
                    : "stroke-muted-foreground"
                }`}
                strokeWidth={2.2}
                fill="none"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDiscoverPanelPinned((v) => !v);
                  if (!isDiscoverPanelPinned) setIsDiscoverPanelOpen(true);
                }}
              />
            </BrandedTooltip>
          </div>
          <div className="border-b border-white/10 mb-2" />
          <BrandedTooltip content="Financials">
            <button
              className="flex items-center gap-2 text-foreground text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 transition border border-white/5"
              style={{ background: "none", boxShadow: "none" }}
              onClick={() => navigate("/financials")}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              Financials
            </button>
          </BrandedTooltip>
          <BrandedTooltip content="BrainStorming">
            <button
              className="flex items-center gap-2 text-foreground text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 transition border border-white/5"
              style={{ background: "none", boxShadow: "none" }}
              onClick={() => navigate("/brainstorming")}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              BrainStorming
            </button>
          </BrandedTooltip>
          <BrandedTooltip content="Copilot">
            <button
              className="flex items-center gap-2 text-foreground text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 transition border border-white/5"
              style={{ background: "none", boxShadow: "none" }}
              onClick={() => navigate("/copilot")}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
              Copilot
            </button>
          </BrandedTooltip>
        </div>
      </motion.div>
      {/* Mobile overlay when panels are open */}
      {typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        (isNavPanelOpen || isDiscoverPanelOpen) && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => {
              setIsNavPanelOpen(false);
              setIsDiscoverPanelOpen(false);
            }}
          />
        )}
      {/* --- END NAVBAR FROM SEARCH PAGE --- */}

      {/* Subtle background layer removed to expose root color */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.12 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0 transition-all duration-1000 z-0 bg-transparent"
        style={{ backdropFilter: "none" }}
      />

      {/* Welcome Message */}
      {showWelcomeMessage && !sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <h2
            className="text-3xl font-thin text-foreground text-center tracking-[0.28em] leading-tight"
            style={{
              fontFamily:
                "'All Round Gothic', 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 200,
              letterSpacing: "0.14em",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            How we can change the world?
          </h2>
        </motion.div>
      )}

      {/* Chat UI Glass Layer */}
      <motion.div
        className="relative z-10 flex flex-col h-full bg-transparent"
        animate={{
          x:
            ((isNavPanelOpen || isNavPanelPinned) && !isDiscoverPanelOpen) ||
            isDiscoverPanelOpen ||
            isDiscoverPanelPinned
              ? 240
              : 0,
          scale:
            ((isNavPanelOpen || isNavPanelPinned) && !isDiscoverPanelOpen) ||
            isDiscoverPanelOpen ||
            isDiscoverPanelPinned
              ? 0.95
              : 1,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        style={{ willChange: "transform" }}
      >
        {/* Desktop Header (hidden on mobile) */}
        <div className="hidden md:flex absolute top-0 left-0 right-0 justify-between items-center px-3 py-4 z-40">
          <div className="flex items-center gap-2">
            {/* Render actual header when panel is not visible; otherwise render invisible placeholders to preserve layout */}
            {!isAnySidePanelVisible ? (
              <>
                <button
                  onClick={() => navigate("/search")}
                  className="p-2 rounded-full hover:bg-muted transition-all"
                  title="Back to Search"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Nelieo</h1>
              </>
            ) : (
              <div className="opacity-0 pointer-events-none select-none flex items-center gap-2">
                <button className="p-2 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Nelieo</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Replace Start New Chat with Search icon (opens chat history) */}
            <button
              onClick={() => setChatQuickOpen(true)}
              className="p-2 rounded-full flex items-center justify-center bg-transparent hover:bg-white/6 transition"
              title="Search chats"
              aria-label="Search chats"
            >
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/6 backdrop-blur-md border border-white/10"
                style={{
                  boxShadow:
                    "0 8px 24px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.02)",
                }}
              >
                <SearchIcon className="w-4 h-4 text-foreground" />
              </span>
            </button>

            {/* Modern Share button */}
            <button
              onClick={() => {
                // attempt to share the current chat link or copy URL
                const shareData = {
                  title: document.title,
                  text: `Check out my chat on Nelieo`,
                  url: window.location.href,
                };
                if ((navigator as any).share) {
                  (navigator as any)
                    .share(shareData)
                    .catch(() =>
                      navigator.clipboard.writeText(window.location.href)
                    );
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copied",
                    description: "Chat link copied to clipboard.",
                  });
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-transparent hover:bg-white/5 dark:hover:bg-white/5 text-foreground transition"
              title="Share chat"
            >
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Share</span>
            </button>

            {/* Canvas icon appears to the right of Share when canvas belongs to this chat */}
            {canvasAssociatedChatId &&
              canvasAssociatedChatId === currentChatId && (
                <button
                  onClick={async () => {
                    // If we already have the canvas content loaded, just toggle
                    if (canvasFullAnswer) {
                      setCanvasOpen((v) => !v);
                      return;
                    }

                    if (!currentChatId) {
                      toast({
                        title: "No chat selected",
                        description: "Select a chat to view its canvas.",
                      });
                      return;
                    }

                    try {
                      const chatRef = doc(db, "chats", currentChatId);
                      const snap = await getDoc(chatRef);
                      const data = snap.exists() ? snap.data() : null;
                      if (data?.canvas && data.canvas.fullAnswer) {
                        setCanvasFullAnswer(data.canvas.fullAnswer);
                        setCanvasSummary(data.canvas.summary || null);
                        setCanvasMetrics(data.canvas.metrics || null);
                        setCanvasAssociatedChatId(currentChatId);
                        setCanvasOpen(true);
                      } else {
                        toast({
                          title: "No canvas available",
                          description: "This chat has no deep research canvas.",
                        });
                      }
                    } catch (err) {
                      console.error("Failed to load canvas for chat", err);
                      toast({
                        title: "Error",
                        description: "Could not load canvas.",
                      });
                    }
                  }}
                  className="p-2 rounded-full hover:bg-muted transition-all ml-2 bg-card/70 border border-border"
                  title="Open Canvas for this chat"
                >
                  <Layers3 className="w-5 h-5" />
                </button>
              )}
          </div>
        </div>

        {/* Chat messages - Adjust top padding to account for header */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 pt-16 pb-4 space-y-6 custom-scrollbar md:pt-16 pt-[72px] chat-scroll-smooth"
          style={{
            transform: "translateZ(0)",
            willChange: "scroll-position, transform",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Animated loading stages */}
          <AnimatePresence>
            {isLoading && loadingStage && (
              <motion.div
                key={loadingStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-12"
              >
                {loadingStage === "preparing" && (
                  <>
                    <AILoader />
                    <div className="text-sm text-muted-foreground">
                      Preparing...
                    </div>
                  </>
                )}
                {loadingStage === "thinking" && (
                  <>
                    <AILoader />
                    <div className="text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* AnimatePresence for chat messages */}
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.slice(-30).map((msg, index) => {
              // Skip messages with undefined content
              if (!msg.content) {
                return null;
              }

              // Remove Markdown junk
              let rawBlock = msg.content.trim();

              rawBlock = rawBlock
                .replace(/^```json/, "")
                .replace(/^```/, "")
                .replace(/^json/, "")
                .replace(/```$/, "")
                .trim();

              // Try to parse as JSON blocks
              let answerBlocks = null;
              try {
                const parsed = JSON.parse(rawBlock);
                if (Array.isArray(parsed) && parsed.every((b) => b.type)) {
                  answerBlocks = parsed;
                }
              } catch (err) {
                answerBlocks = null;
              }

              if (answerBlocks) {
                const plainText = answerBlocksToText(answerBlocks);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 18, scale: 0.995 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.995 }}
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 26,
                      mass: 0.9,
                    }}
                    className={`relative group ${
                      msg.role === "user"
                        ? "overflow-visible"
                        : "overflow-hidden"
                    } transition-all duration-200 ease-out transform-gpu ${
                      msg.role === "user"
                        ? "bg-primary/10 backdrop-blur-md border border-primary/20 text-foreground rounded-lg px-4 py-2 shadow-sm max-w-[90%] sm:max-w-sm ml-auto sm:mx-auto text-left sm:translate-x-16 translate-x-3"
                        : "text-foreground rounded-lg px-6 py-3 max-w-3xl mx-auto text-left"
                    }`}
                    style={{ willChange: "transform, opacity" }}
                    aria-live={msg.role === "ai" ? "polite" : undefined}
                  >
                    <div className="ai-answer-font">
                      {answerBlocks.map((block, idx) => {
                        switch (block.type) {
                          case "heading":
                            return (
                              <h3
                                key={idx}
                                className="mt-5 text-lg font-medium leading-tight tracking-tight text-foreground"
                                style={{ fontWeight: 500 }}
                              >
                                {block.content}
                              </h3>
                            );
                          case "paragraph":
                            return (
                              <p
                                key={idx}
                                className="mt-2 text-base leading-7 text-foreground/95"
                                style={{
                                  fontWeight: 400,
                                  WebkitFontSmoothing: "antialiased",
                                  MozOsxFontSmoothing: "grayscale",
                                  letterSpacing: "0.01em",
                                }}
                              >
                                {block.content}
                              </p>
                            );
                          case "image":
                            return (
                              <img
                                key={idx}
                                src={block.url}
                                alt="AI visual"
                                className="rounded-lg mt-4 shadow-md w-full max-w-xl"
                              />
                            );
                          case "chart":
                            return (
                              <ChartRendererECharts
                                key={idx}
                                chartType={block.chartType}
                                labels={block.labels}
                                values={block.values}
                                data={block.data}
                              />
                            );
                          case "table":
                            return (
                              <div key={idx} className="w-full mt-4 rounded-lg">
                                {/* Mobile: allow horizontal scroll for wide tables; Desktop (sm+) remains unchanged */}
                                <div className="w-full overflow-x-auto sm:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0">
                                  <table className="min-w-0 sm:min-w-full w-full border border-border rounded-lg overflow-hidden text-sm table-auto">
                                    <thead className="bg-muted text-left">
                                      <tr>
                                        {block.headers.map((h, i) => (
                                          <th
                                            key={i}
                                            className="p-2 font-semibold text-left align-top whitespace-normal break-words"
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {block.rows.map((row, rIdx) => (
                                        <tr
                                          key={rIdx}
                                          className="border-t border-border"
                                        >
                                          {row.map((cell, cIdx) => (
                                            <td
                                              key={cIdx}
                                              className="p-2 align-top whitespace-normal break-words"
                                            >
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}
                    </div>
                    {msg.role === "ai" && (
                      <div className="mt-2 flex gap-1 items-center">
                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(plainText);
                            setCopiedIndex(index);
                            setTimeout(() => setCopiedIndex(null), 5000);
                          }}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title="Copy"
                          style={{ fontSize: 0 }}
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {/* Read Aloud Button */}
                        <button
                          onClick={() => {
                            if (speakingIndex === index) {
                              stopSpeaking();
                            } else {
                              setSpeakingIndex(index);
                              // Use best human-like voice
                              const speak = () => {
                                const utterance =
                                  new window.SpeechSynthesisUtterance(
                                    plainText
                                  );
                                utterance.lang = "en-US";
                                const bestVoice = getBestHumanVoice();
                                if (bestVoice) utterance.voice = bestVoice;
                                utterance.onend = () => setSpeakingIndex(null);
                                window.speechSynthesis.speak(utterance);
                              };
                              // Chrome loads voices async, so ensure they're loaded
                              if (
                                window.speechSynthesis.getVoices().length === 0
                              ) {
                                window.speechSynthesis.onvoiceschanged = speak;
                                window.speechSynthesis.getVoices();
                              } else {
                                speak();
                              }
                            }
                          }}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title={
                            speakingIndex === index
                              ? "Stop Listening"
                              : "Read Aloud"
                          }
                          style={{ fontSize: 0 }}
                        >
                          {speakingIndex === index ? (
                            <Square className="w-4 h-4 text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        {/* PDF Button */}
                        <button
                          onClick={() => openPdfModal(plainText)}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title="Convert to PDF"
                          style={{ fontSize: 0 }}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="absolute right-4 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-auto transition-opacity duration-150">
                        <div className="flex gap-2 px-2 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/6 dark:bg-gray-500/60 backdrop-blur-sm shadow-sm">
                          <button
                            onClick={() => {
                              setEditingIndex(index);
                              setInput(msg.content || "");
                              try {
                                inputRef.current?.focus();
                              } catch {}
                            }}
                            className="p-1 rounded-md hover:bg-muted/80 transition bg-transparent"
                            title="Edit message"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(
                                  msg.content || ""
                                );
                                setCopiedIndex(index);
                                setTimeout(() => setCopiedIndex(null), 3000);
                              } catch {}
                            }}
                            className="p-1 rounded-md hover:bg-muted/80 transition bg-transparent"
                            title="Copy message"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              }

              // While auto-charting, show a chart loader placeholder
              if (
                isAutoCharting &&
                msg.role === "ai" &&
                msg.content === "chart"
              ) {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.99 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="text-foreground rounded-lg px-6 py-3 max-w-3xl mx-auto text-left"
                  >
                    <ChartLoader />
                  </motion.div>
                );
              }

              if (msg.chartData) {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.99 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.25, 0.1, 0.25, 1],
                      type: "spring",
                      stiffness: 200,
                      damping: 25,
                    }}
                    className={`relative group ${
                      msg.role === "user"
                        ? "overflow-visible"
                        : "overflow-hidden"
                    } transition-all ${
                      msg.role === "user"
                        ? "bg-primary/10 backdrop-blur-md border border-primary/20 text-foreground rounded-lg px-4 py-2 shadow-sm max-w-[90%] sm:max-w-sm ml-auto sm:mx-auto text-left sm:translate-x-16 translate-x-3"
                        : "text-foreground rounded-lg px-6 py-3 max-w-3xl mx-auto text-left"
                    }`}
                  >
                    <ChartRendererECharts
                      chartType={msg.chartData.chartType}
                      labels={msg.chartData.labels}
                      values={msg.chartData.values}
                      data={msg.chartData.data}
                    />
                    {msg.role === "ai" && (
                      <div className="mt-2 flex gap-1 items-center">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content || "");
                            setCopiedIndex(index);
                            setTimeout(() => setCopiedIndex(null), 5000);
                          }}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title="Copy"
                          style={{ fontSize: 0 }}
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (speakingIndex === index) {
                              stopSpeaking();
                            } else {
                              setSpeakingIndex(index);
                              const speak = () => {
                                const utterance =
                                  new window.SpeechSynthesisUtterance(
                                    msg.content
                                  );
                                utterance.lang = "en-US";
                                const bestVoice = getBestHumanVoice();
                                if (bestVoice) utterance.voice = bestVoice;
                                utterance.onend = () => setSpeakingIndex(null);
                                window.speechSynthesis.speak(utterance);
                              };
                              if (
                                window.speechSynthesis.getVoices().length === 0
                              ) {
                                window.speechSynthesis.onvoiceschanged = speak;
                                window.speechSynthesis.getVoices();
                              } else {
                                speak();
                              }
                            }
                          }}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title={
                            speakingIndex === index
                              ? "Stop Listening"
                              : "Read Aloud"
                          }
                          style={{ fontSize: 0 }}
                        >
                          {speakingIndex === index ? (
                            <Square className="w-4 h-4 text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openPdfModal(msg.content || "")}
                          className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                          title="Convert to PDF"
                          style={{ fontSize: 0 }}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              }

              // Skip messages with undefined content
              if (!msg.content) {
                return null;
              }

              let raw = msg.content.trim();
              let isChart = false;
              let chartData = null;
              try {
                const parsed = JSON.parse(raw);
                if (
                  parsed.chartType &&
                  Array.isArray(parsed.labels) &&
                  Array.isArray(parsed.values) &&
                  parsed.values.length > 0
                ) {
                  isChart = true;
                  chartData = parsed;
                }
              } catch (err) {
                isChart = false;
              }

              // Support inline video message objects: { type:"video", url, demo? }
              let videoBlock: null | { url: string; demo?: boolean } = null;
              try {
                const maybe = JSON.parse(raw);
                if (
                  maybe &&
                  maybe.type === "video" &&
                  typeof maybe.url === "string"
                ) {
                  videoBlock = { url: maybe.url, demo: !!maybe.demo };
                }
              } catch {}

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                  }}
                  className={`relative group ${
                    msg.role === "user" ? "overflow-visible" : "overflow-hidden"
                  } transition-all ${
                    msg.role === "user"
                      ? "bg-primary/10 backdrop-blur-md border border-primary/20 text-foreground rounded-lg px-4 py-2 shadow-sm max-w-[90%] sm:max-w-sm ml-auto sm:mx-auto text-left sm:translate-x-16 translate-x-3"
                      : "text-foreground rounded-lg px-6 py-3 max-w-3xl mx-auto text-left"
                  }`}
                  style={{ willChange: "transform, opacity" }}
                >
                  {videoBlock ? (
                    <div className="space-y-3">
                      {videoBlock.demo && (
                        <div className="text-xs text-muted-foreground">
                          Demo preview (fallback)
                        </div>
                      )}
                      <video
                        src={videoBlock.url}
                        controls
                        className="w-full rounded-lg border border-border shadow"
                      />
                      <div className="flex gap-2">
                        <a
                          href={videoBlock.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                        >
                          Open
                        </a>
                        <a
                          href={videoBlock.url}
                          download
                          className="px-3 py-1 bg-muted text-foreground rounded-md text-sm hover:bg-muted/80 border border-border"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ) : isChart && chartData ? (
                    <ChartRendererECharts
                      chartType={chartData.chartType}
                      labels={chartData.labels}
                      values={chartData.values}
                      data={chartData.data}
                    />
                  ) : msg.role === "ai" &&
                    messages.length > 0 &&
                    messages[messages.length - 1] === msg &&
                    animatingMessageIndex !== null &&
                    !(msg as any).noAnimate ? (
                    <TypingAnimation
                      text={msg.content || ""}
                      speed={6}
                      typingDelay={150}
                      onComplete={() => setAnimatingMessageIndex(null)}
                    />
                  ) : (
                    <div className="ai-answer-font markdown-root prose dark:prose-invert text-foreground [&_*]:text-foreground">
                      {msg.role === "ai" ? (
                        // Mobile-safe wrapper: allow horizontal scroll for wide markdown tables only for AI answers
                        <div className="w-full overflow-x-auto sm:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0">
                          <div className="min-w-0 sm:min-w-full">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content || ""}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        // User messages: render normally and allow wrapping to prevent horizontal scroll on mobile
                        <div className="w-full break-words whitespace-normal">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content || ""}
                          </ReactMarkdown>
                        </div>
                      )}
                      {msg.role === "user" && (
                        <div className="absolute right-4 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-auto transition-opacity duration-150">
                          <div className="flex gap-2 px-2 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/6 dark:bg-gray-500/600 backdrop-blur-sm shadow-sm">
                            <button
                              onClick={() => {
                                setEditingIndex(index);
                                setInput(msg.content || "");
                                try {
                                  inputRef.current?.focus();
                                } catch {}
                              }}
                              className="p-1 rounded-md hover:bg-muted/80 transition bg-transparent"
                              title="Edit message"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  navigator.clipboard.writeText(
                                    msg.content || ""
                                  );
                                  setCopiedIndex(index);
                                  setTimeout(() => setCopiedIndex(null), 3000);
                                } catch {}
                              }}
                              className="p-1 rounded-md hover:bg-muted/80 transition bg-transparent"
                              title="Copy message"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.role === "ai" && (
                    <div className="mt-2 flex gap-1 items-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content || "");
                          setCopiedIndex(index);
                          setTimeout(() => setCopiedIndex(null), 5000);
                        }}
                        className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                        title="Copy"
                        style={{ fontSize: 0 }}
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (speakingIndex === index) {
                            stopSpeaking();
                          } else {
                            setSpeakingIndex(index);
                            const speak = () => {
                              const utterance =
                                new window.SpeechSynthesisUtterance(
                                  msg.content
                                );
                              utterance.lang = "en-US";
                              const bestVoice = getBestHumanVoice();
                              if (bestVoice) utterance.voice = bestVoice;
                              utterance.onend = () => setSpeakingIndex(null);
                              window.speechSynthesis.speak(utterance);
                            };
                            if (
                              window.speechSynthesis.getVoices().length === 0
                            ) {
                              window.speechSynthesis.onvoiceschanged = speak;
                              window.speechSynthesis.getVoices();
                            } else {
                              speak();
                            }
                          }
                        }}
                        className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                        title={
                          speakingIndex === index
                            ? "Stop Listening"
                            : "Read Aloud"
                        }
                        style={{ fontSize: 0 }}
                      >
                        {speakingIndex === index ? (
                          <Square className="w-4 h-4 text-red-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openPdfModal(msg.content || "")}
                        className="p-1 rounded transition bg-transparent hover:bg-muted/80 flex items-center"
                        title="Convert to PDF"
                        style={{ fontSize: 0 }}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* NEW: direct render of autoChartResult preview */}
          {autoChartResult && (
            <ChartRendererECharts
              chartType={autoChartResult.chartType}
              labels={autoChartResult.labels}
              values={autoChartResult.values}
              data={autoChartResult.data}
            />
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4">
          <div className="relative max-w-3xl mx-auto px-2 sm:px-0">
            {activeArsenal && config && (
              <div className="mb-0">
                <div className="w-full inline-flex flex-wrap items-center gap-2 px-4 py-2 rounded-t-2xl border-2 border-orange-400/30 dark:border-orange-500/25 border-b-transparent -mb-px bg-[rgba(249,115,22,0.06)] dark:bg-[rgba(249,115,22,0.03)] shadow-sm transition-all">
                  {config.features.deepResearch && (
                    <span className="px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-700">
                      Deep Research
                    </span>
                  )}
                  {config.features.smartSearch && (
                    <span className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700">
                      Smart Search
                    </span>
                  )}
                  {config.features.explainLikePhD && (
                    <span className="px-2 py-1 text-xs rounded bg-amber-50 text-amber-700">
                      Think Like PhD
                    </span>
                  )}
                  {config.features.judge && (
                    <span className="px-2 py-1 text-xs rounded bg-sky-50 text-sky-700">
                      Supreme Judge
                    </span>
                  )}
                  {config.features.contrarian && (
                    <span className="px-2 py-1 text-xs rounded bg-rose-50 text-rose-700">
                      The Reality
                    </span>
                  )}
                  {config.apps.gmail && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      Gmail
                    </span>
                  )}
                  {config.apps.reddit && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      Reddit
                    </span>
                  )}
                  {config.apps.twitter && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      Twitter
                    </span>
                  )}
                  {config.apps.youtube && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      YouTube
                    </span>
                  )}
                  {config.apps.notion && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      Notion
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Scroll Down Button (centered above input) */}
            {showScrollDown && (
              <motion.button
                onClick={scrollToBottom}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={
                  "absolute -top-10 left-[48%] z-50 transform -translate-x-1/2 bg-white text-black rounded-full p-2 shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition-all"
                }
                style={{
                  willChange: "transform, opacity",
                  WebkitTapHighlightColor: "transparent",
                }}
                aria-label="Scroll to latest message"
                title="Scroll to latest message"
              >
                <ArrowDown className="w-4 h-4 drop-shadow-sm" />
              </motion.button>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative z-10 flex flex-wrap sm:flex-nowrap gap-2 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 bg-transparent dark:bg-gray-800/180 backdrop-blur-xl border border-black/35 dark:border-white/10 transition-all duration-300 shadow-none dark:shadow-[0_8px_32px_rgba(16,24,40,0.24)] dark:focus-within:ring-2 dark:focus-within:ring-white/20 dark:focus-within:shadow-[0_6px_24px_rgba(255,255,255,0.06)]"
            >
              <div className="flex-1 flex flex-col gap-2 w-full">
                {/* Input Field (auto-growing) */}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // schedule resize for snappy feel
                    autoResizeInput();
                  }}
                  onInput={() => autoResizeInput()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask anything"
                  className="w-full text-sm sm:text-base bg-transparent text-foreground placeholder:text-muted-foreground outline-none pl-2 sm:pl-3 pr-2 sm:pr-3 py-1.5 mb-0 focus:ring-0 caret-current resize-none overflow-hidden leading-relaxed smooth-input"
                  style={{
                    // Height is managed via JS for smooth auto-grow
                    height: 30,
                  }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  autoComplete="off"
                />

                {/* Bottom Row with Smart Search Button and Controls */}
                <div className="flex justify-between items-center">
                  {/* Left Side - Attachment + Smart Search + Arsenal Button */}
                  <div className="flex gap-2 items-center">
                    {/* Attachment Plus Button */}
                    <BrandedTooltip content="Attach files and More">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="group p-2 rounded-lg bg-transparent hover:bg-muted/80 transition-all relative"
                        style={{ willChange: "transform" }}
                        title="Open tools"
                        onClick={() => setShowArsnel((v) => !v)}
                      >
                        <motion.div
                          whileHover={{
                            rotate: [0, 90, 180, 270, 360],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 0.8,
                            ease: "easeInOut",
                            times: [0, 0.25, 0.5, 0.75, 1],
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300"
                          >
                            <path d="M12 5v14m-7-7h14" />
                          </svg>
                        </motion.div>
                      </motion.button>
                    </BrandedTooltip>
                    {/* Panel opened by +: render inline animated panel with Arsenal and Smart Search */}
                    {showArsnel && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute bottom-14 left-0 z-50 w-46 p-3 rounded-2xl bg-card border border-border shadow-lg"
                        style={{
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <div className="flex flex-col gap-2">
                          <button
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
                            onClick={() => {
                              // Attach anything action placeholder
                              setShowArsnel(false);
                              toast({
                                title: "Attach anything",
                                description:
                                  "Open file picker or attach resources.",
                              });
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-5 h-5 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.2-9.2a3.5 3.5 0 014.95 4.95l-9.2 9.2a1.5 1.5 0 01-2.12-2.12l8.49-8.49" />
                            </svg>
                            <div className="text-left">
                              <div className="text-sm font-semibold">
                                Attach anything
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Files, links, or references
                              </div>
                            </div>
                          </button>

                          <div className="h-px bg-white/20 my-1" />

                          <button
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
                            onClick={() => {
                              // Activate Arsenal mode and close the tools panel
                              setActiveArsenal(true);
                              setShowArsnel(false);
                              toast({
                                title: "Arsenal activated",
                                description:
                                  "Arsenal mode is now active in the input bar.",
                              });
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-5 h-5 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M2 17l10 5 10-5" />
                              <path d="M2 12l10 5 10-5" />
                            </svg>
                            <div className="text-left">
                              <div className="text-sm font-semibold">
                                Arsenal
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Advanced tools and Connectors
                              </div>
                            </div>
                          </button>

                          <button
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
                            onClick={() => {
                              // Open the Deep Research Canvas and close the tools panel
                              setCanvasOpen(true);
                              setShowArsnel(false);
                              toast({
                                title: "Canvas opened",
                                description: "Opened Deep Research Canvas",
                              });
                            }}
                          >
                            <BookOpenCheck className="w-5 h-5 text-muted-foreground" />
                            <div className="text-left">
                              <div className="text-sm font-semibold">
                                Canvas
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Open Deep Research Canvas
                              </div>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* When Arsenal mode is active show a pill in the input bar */}
                    <div className="flex items-center gap-2">
                      {activeArsenal && (
                        <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-4 h-4 text-primary"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          </svg>
                          <span className="text-sm font-medium text-primary">
                            Arsenal
                          </span>
                          <button
                            className="ml-2 p-1 rounded-full hover:bg-muted transition"
                            onClick={() => setActiveArsenal(false)}
                            title="Remove Arsenal"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-3.5 h-3.5 text-primary"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {activeSmartSearch && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1">
                          <Brain className="w-4 h-4 text-emerald-700" />
                          <span className="text-sm font-medium text-emerald-700">
                            Smart Search
                          </span>
                          <button
                            className="ml-2 p-1 rounded-full hover:bg-muted transition"
                            onClick={() => setActiveSmartSearch(false)}
                            title="Remove Smart Search"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-3.5 h-3.5 text-emerald-700"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Controls Group */}
                  <div className="flex items-center gap-2">
                    {/* Mic Button */}
                    <motion.button
                      onClick={handleMicClick}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="p-1.5 rounded-xl hover:bg-muted transition"
                      title="Voice Input"
                      style={{ willChange: "transform" }}
                    >
                      <Mic
                        className={`w-4 h-4 ${
                          isListening
                            ? "animate-micPulse text-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </motion.button>

                    {/* Send/AudioLines Button */}
                    {input.trim() ? (
                      <motion.button
                        onClick={sendMessage}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="p-2 bg-primary hover:bg-primary/90 rounded-full text-primary-foreground transition"
                        title="Send"
                        style={{ willChange: "transform" }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                          stroke="currentColor"
                          className="w-5 h-5 rotate-[-90deg]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => navigate("/chat")}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        className="p-2 rounded-full transform-gpu transition-shadow transition-transform shadow-sm backdrop-blur-md bg-white/6 dark:bg-black/6 border border-white/10 dark:border-white/6 text-slate-700 dark:text-slate-200 hover:scale-105 hover:bg-white/10 dark:hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-slate-200/10 dark:focus:ring-slate-800/20"
                        title="Audio Chat"
                        aria-label="Start audio chat"
                        style={{
                          willChange: "transform",
                          WebkitBackdropFilter: "blur(6px)",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        <AudioLines className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Overlay FocusDashboard as a modal */}
            {focusMode && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-background/80 backdrop-blur"
                onClick={() => setFocusMode(false)}
              >
                <div
                  className="bg-card text-foreground border border-border rounded-xl shadow-2xl p-6 max-w-lg w-full relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setFocusMode(false)}
                  >
                    ×
                  </button>
                  <FocusDashboard
                    positions={widgetPositions}
                    onDrag={handleWidgetDrag}
                    onDone={() => {
                      setFocusMode(false);
                      setShowWidgets(true);
                    }}
                  />
                </div>
              </div>
            )}
            {/* Show widgets on chat page after "Done" */}
            {showWidgets && (
              <FocusDashboard
                positions={widgetPositions}
                onDrag={handleWidgetDrag}
                isLive
              />
            )}
          </div>
        </div>

        {/* Restore original ChatSidebar component */}
        <ChatSidebar
          chats={chatHistory}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={(chat) => {
            // Handle both new format (messages array) and old format (question/answer)
            if (chat.messages && Array.isArray(chat.messages)) {
              // New format: set all messages from the chat session
              suppressNextAnimationRef.current = true; // prevent retyping on restore
              setMessages(
                chat.messages.map((msg) => ({
                  role: msg.role as "user" | "ai",
                  content: msg.content,
                }))
              );
              setCurrentChatId(chat.id);
              setIsNewChatSession(false);
              // Restore canvas if present
              if (chat.canvas && chat.canvas.fullAnswer) {
                setCanvasFullAnswer(chat.canvas.fullAnswer);
                setCanvasSummary(chat.canvas.summary || null);
                setCanvasMetrics(chat.canvas.metrics || null);
                setCanvasId(chat.canvas.id || null);
                setCanvasAssociatedChatId(chat.id);
                setCanvasOpen(true);
              } else {
                setCanvasFullAnswer(null);
                setCanvasSummary(null);
                setCanvasMetrics(null);
                setCanvasId(null);
                if (canvasAssociatedChatId === chat.id)
                  setCanvasAssociatedChatId(null);
              }
            } else if (chat.question && chat.answer) {
              // Old format: backward compatibility
              setMessages([
                { role: "user" as "user", content: chat.question },
                { role: "ai" as "ai", content: chat.answer },
              ]);
              setCurrentChatId(null);
              setIsNewChatSession(true);
            }
            setAnimatingMessageIndex(null); // No animation for restored messages
            setShowWelcomeMessage(false);
            setSidebarOpen(false);
          }}
          onStartNewChat={handleStartNewChat}
        />
      </motion.div>
      {/* Deep Research Canvas Artifact */}
      {canvasSummary && !canvasOpen && (
        <div
          className="mx-auto w-full max-w-3xl px-4 mt-4"
          onClick={() => setCanvasOpen(true)}
        >
          <div className="group cursor-pointer rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 flex items-start gap-4 hover:border-primary/50 transition shadow-sm hover:shadow-md relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition"
              style={{
                background:
                  "radial-gradient(circle at 85% 15%, rgba(255,140,0,0.12), transparent 60%)",
              }}
            />
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                Deep Research Canvas
                {canvasId && (
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                    ID {canvasId.slice(0, 8)}
                  </span>
                )}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {canvasSummary}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-primary/70 font-medium">
                Interactive artifact • Click to open
              </p>
            </div>
            <div className="shrink-0 w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center bg-gradient-to-br from-background to-background/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                fill="none"
                className="w-6 h-6 text-primary"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
      <DeepResearchCanvas
        open={canvasOpen}
        onClose={() => setCanvasOpen(false)}
        query={useMemo(() => {
          const lastUser = [...messages]
            .reverse()
            .find((m) => m.role === "user");
          return lastUser ? lastUser.content : input;
        }, [messages, input])}
        fullAnswer={canvasFullAnswer || undefined}
        summary={canvasSummary}
      />

      {/* Modals and Floating Buttons */}
      <SummarizeModal
        open={showSummarizeModal}
        onClose={() => setShowSummarizeModal(false)}
        onSubmit={handleSummarize}
      />
      <ResearchModal
        open={showResearchModal}
        onClose={() => setShowResearchModal(false)}
        onSubmit={startResearch}
      />

      {/* Floating Magic Button with modern gradient border */}
      {!canvasOpen && (
        <BrandedTooltip content="Magic Tools">
          <div className="fixed bottom-32 right-4 sm:bottom-6 sm:right-6 z-50">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={() => setShowTools((prev) => !prev)}
              className="relative group p-[2px] rounded-full"
              title="Magic Tools"
            >
              <div
                className="absolute inset-0 rounded-full opacity-80 group-hover:opacity-100 blur-sm"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(190,190,190,0.9), rgba(249,115,22,0.95), rgba(190,190,190,0.9))",
                  transition: "opacity 200ms ease-out",
                }}
              />
              <div className="relative p-3 rounded-full border border-border text-foreground shadow-lg hover:shadow-[0_8px_30px_rgba(249,115,22,0.18)] transition-all cursor-pointer backdrop-blur-sm bg-white/6 dark:bg-card/90">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 transition-all duration-300 group-hover:rotate-45 group-hover:scale-110"
                >
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
                </svg>
              </div>
            </motion.div>

            {/* Tool Panel (Dropdown Style) */}
            {showTools && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-16 right-0 p-4 w-64 rounded-3xl border border-border space-y-3 backdrop-blur-sm bg-card/95 ring-1 ring-white/6 shadow-lg"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.02) 100%)",
                  backdropFilter: "blur(8px) saturate(1.1)",
                  WebkitBackdropFilter: "blur(8px) saturate(1.1)",
                  boxShadow:
                    "0 8px 40px rgba(249,115,22,0.08), 0 8px 30px rgba(2,6,23,0.12)",
                }}
              >
                <button
                  onClick={() => {
                    setShowSummarizeModal(true);
                    setShowTools(false);
                  }}
                  className="w-full flex items-center gap-3 text-sm text-foreground px-3 py-2 rounded-lg transition-all"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
                    border: "1px solid rgba(249,115,22,0.12)",
                    boxShadow: "0 8px 30px rgba(249,115,22,0.10)",
                  }}
                >
                  <Layers3 className="w-6 h-6 text-[rgb(249,115,22)]" />
                  Summarize Text
                </button>
                <button
                  onClick={() => {
                    setShowResearchModal(true);
                    setShowTools(false);
                  }}
                  className="w-full flex items-center gap-3 text-sm text-foreground px-3 py-2 rounded-lg transition-all"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
                    border: "1px solid rgba(249,115,22,0.12)",
                    boxShadow: "0 8px 30px rgba(249,115,22,0.10)",
                  }}
                >
                  <BookOpenCheck className="w-6 h-6 text-[rgb(249,115,22)]" />{" "}
                  Deep Research
                </button>
                <button
                  onClick={() =>
                    setInput(
                      "Do a market research on [Your Startup Topic] and email me at your@email.com"
                    )
                  }
                  className="w-full flex items-center gap-3 text-sm text-foreground px-3 py-2 rounded-lg transition-all"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
                    border: "1px solid rgba(249,115,22,0.12)",
                    boxShadow: "0 8px 30px rgba(249,115,22,0.10)",
                  }}
                >
                  <Brain className="w-6 h-6 text-[rgb(249,115,22)]" /> Smart
                  Research
                </button>
                <button
                  onClick={() => {
                    setFocusMode(true);
                    setShowTools(false);
                  }}
                  className="w-full flex items-center gap-3 text-sm text-foreground px-3 py-2 rounded-lg transition-all"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))",
                    border: "1px solid rgba(249,115,22,0.12)",
                    boxShadow: "0 8px 30px rgba(249,115,22,0.10)",
                  }}
                >
                  <Target className="w-6 h-6 text-[rgb(249,115,22)]" /> Focus
                  Mode
                </button>
                {/* Export removed as requested */}
              </motion.div>
            )}
          </div>
        </BrandedTooltip>
      )}

      {/* PDF Modal with style options */}
      {showPdfModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 40 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-[2px] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl shadow-2xl p-0 relative overflow-hidden bg-card border border-border"
            style={{
              backdropFilter: "blur(24px) saturate(1.2)",
              WebkitBackdropFilter: "blur(24px) saturate(1.2)",
              // Optional: subtle white overlay for more glass effect
              // backgroundBlendMode: "overlay",
            }}
          >
            {/* Animated gradient bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-1 bg-gradient-to-r from-primary via-primary to-primary"
            />
            <div className="p-7 pb-5">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-2xl font-extrabold mb-4 text-center text-foreground"
                style={{
                  letterSpacing: "0.01em",
                  textShadow: "0 2px 12px rgba(168,85,247,0.18)",
                }}
              >
                🧾 Export as PDF
              </motion.h2>

              <motion.label
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="block mb-2 text-foreground font-semibold"
              >
                Choose Style:
              </motion.label>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
              >
                <select
                  className="w-full p-2 mb-4 rounded-lg border border-border bg-muted text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition"
                  style={{
                    color: "#fff",
                    background:
                      "linear-gradient(90deg, rgba(168,85,247,0.13) 0%, rgba(55,48,163,0.13) 100%)",
                    boxShadow: "0 1px 4px 0 rgba(168,85,247,0.08)",
                  }}
                  value={pdfStyle}
                  onChange={(e) => setPdfStyle(e.target.value)}
                >
                  <option value="normal" style={{ color: "inherit" }}>
                    Normal
                  </option>
                  <option value="mckinsey" style={{ color: "inherit" }}>
                    McKinsey Style
                  </option>
                  <option value="minimal" style={{ color: "inherit" }}>
                    Minimal
                  </option>
                </select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.3 }}
                className="mb-5 max-h-48 overflow-y-auto rounded-lg bg-muted border border-border p-3 text-foreground text-sm shadow-inner backdrop-blur-sm"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "1rem",
                  background:
                    "linear-gradient(90deg, rgba(168,85,247,0.07) 0%, rgba(55,48,163,0.07) 100%)",
                }}
              >
                <pre className="whitespace-pre-wrap font-sans">
                  {pdfContent}
                </pre>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.3 }}
                className="flex justify-between gap-2"
              >
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition font-semibold"
                  style={{
                    boxShadow: "0 1px 4px 0 rgba(168,85,247,0.08)",
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "#a855f7" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePdfGenerate(pdfContent)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold shadow"
                  style={{
                    boxShadow: "0 2px 8px 0 rgba(168,85,247,0.18)",
                  }}
                >
                  Generate
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Chat;
