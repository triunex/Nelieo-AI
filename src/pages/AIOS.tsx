import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Rnd } from "react-rnd";
import {
  Plus,
  X,
  LayoutGrid,
  Instagram,
  Store,
  Mail,
  FileText,
  MonitorSmartphone,
  Lightbulb,
  User2,
  ArrowLeft,
  ArrowRight,
  RefreshCcw,
  CreditCard,
  Eye,
  Pencil,
  LogOut,
  Chrome,
  MessageSquare,
  Linkedin,
  Video,
  Sheet,
  CheckSquare,
  DollarSign,
  Cloud,
  Facebook,
} from "lucide-react";
// import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ui/ThemeToggle";
import bgGalaxy from "@/assets/bg-galaxy.jpg";
// local app logos
import logoFacebook from "@/AI OS app logos/facebook-logo-vector-8730.png";
import logoGmail from "@/AI OS app logos/3nh7w077.png";
import logoInstagram from "@/AI OS app logos/1725819461instagram-logo.png";
import logoChrome from "@/AI OS app logos/nhqu30ud.png";
import logoNotion from "@/AI OS app logos/wzky7zfz.png";
import logoLinkedin from "@/Logos/Linkedin.png";
import logoSlack from "@/Logos/Slack.png";
import logoZoom from "@/Logos/Zoom.png";
import logoSheets from "@/Logos/Google-Sheet.png";
import logoAsana from "@/Logos/Asana.png";
import logoSalesforce from "@/Logos/Salesforce.png";
import logoQuickBooks from "@/Logos/QuickBooks.png";
import AgentBridgeManager, { AIOSAgentBridge, AgentUpdate } from '@/services/aios-agent-bridge';
import AgentStepsPanel from '@/components/AgentStepsPanel';
import { motion, AnimatePresence } from "framer-motion";
import { auth, db, storage as firebaseStorage } from "@/firebase";
import AgentCursor from "@/components/AgentCursor";
import AgentOverlay from "@/components/AgentOverlay";
import { simpleAgentBridge } from "@/services/simple-agent-bridge";
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { detectAppsFromQuery, describeWorkflow, isMultiAppWorkflow } from "@/utils/intent-detection";

type AppId =
  | "chrome"
  | "gmail"
  | "notion"
  | "instagram"
  | "facebook"
  | "salesforce"
  | "quickbooks"
  | "slack"
  | "linkedin"
  | "sheets"
  | "zoom"
  | "asana";

type WindowState = {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized?: boolean;
  maximized?: boolean;
  payload?: any;
};

type AppDefinition = {
  id: AppId;
  name: string;
  icon: string; // url to an image for the app
  launch: (openWindow: (w: Partial<WindowState>) => void) => void;
};

const DEFAULT_WALLPAPERS = [
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80&auto=format&fit=crop",
  bgGalaxy as unknown as string,
  // Nature
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80&auto=format&fit=crop",
  // Space
  "https://images.unsplash.com/photo-1738996691944-989ee7cd2256?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1450849608880-6f787542c88a?w=1600&q=80&auto=format&fit=crop",
  // Abstract gradients
  "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #0b1020 100%)",
  "linear-gradient(120deg, #0f172a, #3b0764, #111827)",
  // City & mountains
  "https://images.unsplash.com/photo-1505699261378-c372af38134c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80&auto=format&fit=crop",
  // Ocean
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&auto=format&fit=crop",
];

function useZCounter() {
  const ref = useRef(10);
  return () => ++ref.current;
}

const AIOS: React.FC = () => {
  // const navigate = useNavigate();
  // wallpaper can be gradient css or image url
  const [wallpaper, setWallpaper] = useState<string>(
    () => localStorage.getItem("aios.wallpaper") || DEFAULT_WALLPAPERS[0]
  );
  // quick helpers removed: we only show pinned app icons in the dock
  const [showSettings, setShowSettings] = useState(false);
  const [showAiTools, setShowAiTools] = useState(false);
  const [selectedAiMode, setSelectedAiMode] = useState<"chat" | "aurion">(
    "chat"
  );
  const [command, setCommand] = useState("");
  const [pinned, setPinned] = useState<AppId[]>(() => {
    try {
      const saved = localStorage.getItem("aios.pinned");
      return saved
        ? (JSON.parse(saved) as AppId[])
        : [
          "chrome",
          "gmail",
          "notion",
          "slack",
          "zoom",
          "sheets",
        ];
    } catch {
      return [
        "chrome",
        "gmail",
        "notion",
        "slack",
        "zoom",
        "sheets",
      ];
    }
  });
  const [windows, setWindows] = useState<WindowState[]>([]);
  const nextZ = useZCounter();

  // SuperAgent cursor and overlay state
  const [agentCursor, setAgentCursor] = useState<{
    visible: boolean;
    x: number;
    y: number;
    action?: 'click' | 'type' | 'wait' | 'observe' | 'success' | 'error' | 'thinking';
    text?: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    action: 'wait',
    text: '',
  });

  const [agentStatus, setAgentStatus] = useState<{
    isActive: boolean;
    currentTask?: string;
    currentAction?: string;
    thinking?: string;
    planSteps?: string[];
    currentStepIndex?: number;
    confidence?: number;
    actionsCompleted?: number;
    estimatedTimeRemaining?: number;
    error?: string;
  }>({
    isActive: false,
  });

  // Expose agent status for components defined in-file (quick bridge)
  useEffect(() => {
    (window as any).agentStatus = agentStatus;
  }, [agentStatus]);

  // Dock hover magnification state
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockHoverX, setDockHoverX] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("aios.pinned", JSON.stringify(pinned));
  }, [pinned]);

  // Only allow container apps in the dock
  const ALLOWED_DOCK = useMemo(
    () =>
      new Set<AppId>([
        "chrome",
        "gmail",
        "notion",
        "instagram",
        "facebook",
        "salesforce",
        "quickbooks",
        "slack",
        "linkedin",
        "sheets",
        "zoom",
        "asana",
      ]),
    []
  );
  useEffect(() => {
    setPinned((p) => {
      const filtered = p.filter((id) => ALLOWED_DOCK.has(id));
      return filtered.length
        ? filtered
        : [
          "chrome",
          "gmail",
          "notion",
          "slack",
          "zoom",
          "sheets",
        ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("aios.wallpaper", wallpaper);
  }, [wallpaper]);

  // SuperAgent event listeners
  useEffect(() => {
    const handleCursor = (position: any) => {
      setAgentCursor(position);
    };

    const handleStatus = (status: any) => {
      // If status explicitly clears isActive, replace entirely (cancellation case)
      if (status.isActive === false && !status.currentTask && !status.planSteps) {
        setAgentStatus(status);
      } else {
        // Otherwise merge incoming status with current state
        setAgentStatus(prev => ({
          ...prev,
          ...status,
        }));
      }
    };

    const handleComplete = () => {
      setAgentCursor(prev => ({ ...prev, visible: false }));
      setAgentStatus(prev => ({
        ...prev,
        isActive: false,
        currentStepIndex: prev.planSteps ? prev.planSteps.length - 1 : 0,
      }));
      toast({
        title: "Task completed!",
        description: "SuperAgent finished the task successfully.",
      });
    };

    const handleError = (data: any) => {
      setAgentCursor(prev => ({ ...prev, action: 'error', text: data.error }));
      toast({
        title: "Task failed",
        description: data.error,
        variant: "destructive",
      });
    };

    // Subscribe to events
    simpleAgentBridge.on('cursor', handleCursor);
    simpleAgentBridge.on('status', handleStatus);
    simpleAgentBridge.on('complete', handleComplete);
    simpleAgentBridge.on('error', handleError);

    // Cleanup
    return () => {
      simpleAgentBridge.off('cursor', handleCursor);
      simpleAgentBridge.off('status', handleStatus);
      simpleAgentBridge.off('complete', handleComplete);
      simpleAgentBridge.off('error', handleError);
    };
  }, []);

  const focusWindow = (id: string) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: nextZ() } : w)));
  };

  const closeWindow = (id: string) =>
    setWindows((ws) => ws.filter((w) => w.id !== id));
  // removed minimize/maximize behavior for simplified window chrome

  const openWindow = useCallback(
    (partial: Partial<WindowState>) => {
      const id = crypto.randomUUID();
      const w: WindowState = {
        id,
        appId: (partial.appId || "chrome") as AppId,
        title: partial.title || "Window",
        // default to the centered SettingsPanel size/position when not provided
        ...(() => {
          const s = getSettingsPanelSize();
          return {
            x: partial.x ?? s.x,
            y: partial.y ?? s.y,
            width: partial.width ?? s.width,
            height: partial.height ?? s.height,
          } as { x: number; y: number; width: number; height: number };
        })(),
        z: nextZ(),
        minimized: false,
        maximized: false,
        payload: partial.payload,
      };
      setWindows((ws) => {
        const updated = [...ws, w];
        return tileRemote(updated);
      });
    },
    [nextZ]
  );

  // Arrange app windows side-by-side (simple tiling)
  const tileRemote = (ws: WindowState[]) => {
    // Get all app windows that are not minimized
    const appWindows = ws.filter((r) => !r.minimized);
    // Only tile when there are multiple windows
    if (appWindows.length <= 1) return ws;
    const pad = 32;
    const topOffset = 96; // below dock
    const availableWidth = window.innerWidth - pad * 2;
    const maxHeight = Math.min(640, window.innerHeight - 240);
    const perWidth = Math.min(
      1100,
      Math.floor(availableWidth / appWindows.length) - 24
    );
    appWindows.forEach((w, i) => {
      w.x = pad + i * (perWidth + 24);
      w.y = topOffset;
      w.width = perWidth;
      w.height = maxHeight;
    });
    return ws;
  };

  /* Calculate the SettingsPanel size & centered position so we can open app windows
     at the exact same width/height/center as the Settings panel shown in the UI. */
  const getSettingsPanelSize = () => {
    // Matches: "relative w-[92%] md:w-[760px] h-[66vh]"
    const width =
      window.innerWidth >= 768 ? 760 : Math.floor(window.innerWidth * 0.92);
    const height = Math.round(window.innerHeight * 0.66);
    const x = Math.max(8, Math.floor((window.innerWidth - width) / 2));
    const y = Math.max(88, Math.floor((window.innerHeight - height) / 2));
    return { width, height, x, y };
  };

  const APPS: Record<AppId, AppDefinition> = useMemo(
    () => ({
      chrome: {
        id: "chrome",
        name: "Chrome",
        icon: logoChrome,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "chrome",
            title: "Chrome Browser",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "chrome",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      gmail: {
        id: "gmail",
        name: "Gmail",
        icon: logoGmail,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "gmail",
            title: "Gmail",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "gmail",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      notion: {
        id: "notion",
        name: "Notion",
        icon: logoNotion,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "notion",
            title: "Notion",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "notion",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      instagram: {
        id: "instagram",
        name: "Instagram",
        icon: logoInstagram,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "instagram",
            title: "Instagram",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "instagram",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      facebook: {
        id: "facebook",
        name: "Facebook",
        icon: logoFacebook,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "facebook",
            title: "Facebook",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "facebook",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      salesforce: {
        id: "salesforce",
        name: "Salesforce",
        icon: logoSalesforce,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "salesforce",
            title: "Salesforce",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "salesforce",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      quickbooks: {
        id: "quickbooks",
        name: "QuickBooks",
        icon: logoQuickBooks,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "quickbooks",
            title: "QuickBooks",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "quickbooks",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      slack: {
        id: "slack",
        name: "Slack",
        icon: logoSlack,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "slack",
            title: "Slack",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "slack",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      linkedin: {
        id: "linkedin",
        name: "LinkedIn",
        icon: logoLinkedin,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "linkedin",
            title: "LinkedIn",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "linkedin",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      sheets: {
        id: "sheets",
        name: "Google Sheets",
        icon: logoSheets,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "sheets",
            title: "Google Sheets",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "sheets",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      zoom: {
        id: "zoom",
        name: "Zoom",
        icon: logoZoom,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "zoom",
            title: "Zoom",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "zoom",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
      asana: {
        id: "asana",
        name: "Asana",
        icon: logoAsana,
        launch: (open) => {
          const s = getSettingsPanelSize();
          open({
            appId: "asana",
            title: "Asana",
            width: s.width,
            height: s.height,
            x: s.x,
            y: s.y,
            payload: {
              url: "http://localhost:10005/",
              appName: "asana",
              hideControls: true,
              isStreaming: true,
            },
          });
        },
      },
    }),
    []
  );

  // Listen for app_opened events from backend (after APPS is defined)
  useEffect(() => {
    const handleAppOpened = (data: any) => {
      console.log('📱 App opened event received:', data);
      const appId = data.app as AppId;  // chrome, gmail, etc.

      // Open window in frontend using the APPS definition
      if (APPS[appId]) {
        console.log(`🚀 Opening ${appId} window in frontend`);
        APPS[appId].launch(openWindow);

        toast({
          title: "App Opened",
          description: `${data.appName} is now available`,
        });
      }
    };

    simpleAgentBridge.on('app_opened', handleAppOpened);

    return () => {
      simpleAgentBridge.off('app_opened', handleAppOpened);
    };
  }, [APPS, openWindow]);

  const runCommand = async (t: string) => {
    const prompt = t.trim();

    // 🎯 INTENT DETECTION - Analyze query to determine which apps are needed
    const detectedApps = detectAppsFromQuery(prompt);
    const workflowDescription = describeWorkflow(prompt);
    const isMultiApp = isMultiAppWorkflow(prompt);

    console.log("🎯 Intent Detection Results:", {
      query: prompt,
      detectedApps,
      isMultiApp,
      workflowDescription
    });

    // Show workflow description to user
    toast({
      title: "🤖 Understanding Your Task",
      description: workflowDescription,
    });

    try {
      // Show agent is active
      setAgentStatus({
        isActive: true,
        currentTask: t,
        thinking: 'Opening required apps...',
        planSteps: [
          'Detecting required apps',
          'Opening apps sequentially',
          'Executing task with SuperAgent',
          'Verifying results',
        ],
        currentStepIndex: 0,
        actionsCompleted: 0,
      });

      // 📱 SEQUENTIAL APP OPENING - Open detected apps one by one
      if (detectedApps.length > 0) {
        for (let i = 0; i < detectedApps.length; i++) {
          const appId = detectedApps[i];

          if (APPS[appId]) {
            console.log(`📱 Opening app ${i + 1}/${detectedApps.length}: ${appId}`);

            // Open the app window
            APPS[appId].launch(openWindow);

            // Show toast for each app
            toast({
              title: `Opening ${APPS[appId].name}`,
              description: `App ${i + 1} of ${detectedApps.length}`,
            });

            // Wait 2 seconds between app launches to avoid overwhelming the system
            if (i < detectedApps.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        // Update agent status
        setAgentStatus(prev => ({
          ...prev,
          currentStepIndex: 1,
          thinking: 'Apps opened. Executing task...',
        }));
      }

      // 🤖 EXECUTE TASK WITH SUPERAGENT - Send to backend for automation
      toast({
        title: "🤖 SuperAgent Working",
        description: "AI is analyzing the screen and executing your task...",
      });

      const response = await fetch("/api/superagent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: t,
          timeout: 600 // 🔥 EXTENDED: 10 minutes for complex multi-step tasks (Gmail replies, multi-app workflows)
        }),
      });

      // Handle rate limit and other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Special handling for 429 rate limit errors
        if (response.status === 429) {
          console.warn("⚠️ Vision API rate limited (429)");
          toast({
            title: "⏸️ Vision API Rate Limited",
            description: "The AI vision service is temporarily rate limited. Apps have been opened based on intent detection. You can manually complete the task or wait a few minutes and try again.",
            variant: "destructive",
          });

          // Update agent status to show rate limit
          setAgentStatus({
            isActive: false,
            error: 'Vision API rate limited. Apps opened successfully.',
          });

          return; // Exit early, apps are already open
        }

        throw new Error(errorData.error || `SuperAgent returned ${response.status} error`);
      }

      const result = await response.json();

      // Show detailed results
      if (result.status === 'success') {
        toast({
          title: "✅ Task Completed",
          description: (
            <div className="mt-2">
              <p className="font-semibold">{result.task}</p>
              <p className="text-sm mt-1">Steps: {result.iterations}</p>
              <p className="text-sm">Time: {result.execution_time?.toFixed(1)}s</p>
            </div>
          ),
        });

        // Update agent status
        setAgentStatus({
          isActive: false,
        });
      } else {
        toast({
          title: "Task Result",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(result, null, 2)}
              </code>
            </pre>
          ),
        });
      }
    } catch (error) {
      console.error("Error communicating with agent:", error);

      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isRateLimitError = errorMessage.includes("429") || errorMessage.includes("rate limit");

      toast({
        title: isRateLimitError ? "⏸️ Vision API Rate Limited" : "❌ Agent Error",
        description: isRateLimitError
          ? "The AI vision service is temporarily rate limited. Apps have been opened for you. Try again in a few minutes or complete the task manually."
          : (error instanceof Error
            ? error.message
            : "Could not connect to the agent service."),
        variant: "destructive",
      });

      // Update agent status
      setAgentStatus({
        isActive: false,
        error: errorMessage,
      });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = command;
    setCommand("");
    runCommand(c);
  };

  const setWallpaperInput = (val: string) => {
    setWallpaper(val);
  };

  const bgStyle: React.CSSProperties = wallpaper.startsWith("http")
    ? {
      backgroundImage: `url(${wallpaper})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
    : wallpaper.startsWith("linear-gradient")
      ? { backgroundImage: wallpaper }
      : {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };

  return (
    <div className="relative h-screen w-screen bg-white">
      <div className="absolute inset-4 sm:inset-6 md:inset-8 lg:inset-10 rounded-[28px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden">
        <motion.div
          className="relative h-full w-full overflow-hidden"
          style={bgStyle}
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Subtle overlay for readability inside the screen (no blur to keep 4K sharpness) */}
          <motion.div
            className="absolute inset-0 bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          />

          {/* Top Dock */}
          <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
            <div className="mt-1 flex items-center justify-center">
              <motion.div
                ref={dockRef}
                onMouseMove={(e) => {
                  const rect = dockRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setDockHoverX(e.clientX - rect.left);
                }}
                onMouseLeave={() => setDockHoverX(null)}
                className="pointer-events-auto relative dock dock-pill flex items-center gap-2.5 px-4 py-2"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { y: -20, opacity: 0 },
                  show: {
                    y: 0,
                    opacity: 1,
                    transition: {
                      delay: 0.15,
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                      when: "beforeChildren",
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {/* Pins as icons only with magnification */}
                {Array.from(
                  new Set([
                    ...(pinned || []),
                    ...(Object.keys(APPS) as AppId[]),
                  ])
                )
                  .filter((id) => APPS[id])
                  .map((id, idx) => {
                    const app = APPS[id];
                    const base = 28; // px - closer to reference icon size
                    let scale = 1;
                    if (dockHoverX != null && dockRef.current) {
                      const rect = dockRef.current.getBoundingClientRect();
                      const itemX = (idx + 0.5) * (base + 10); // tighter spacing
                      const dist = Math.abs(dockHoverX - itemX);
                      const influence = Math.max(0, 1 - dist / 140);
                      scale = 1 + influence * 0.8;
                    }
                    // Clicking an app should launch it inside the container first,
                    // then open the stream window so only that app is visible.
                    const launchAppAndOpenStream = async () => {
                      try {
                        // Ask backend to open the app (natural language)
                        const resp = await fetch(
                          "http://localhost:10000/api/agent/execute",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userId: "current-user",
                              prompt: `open ${id}`,
                            }),
                          }
                        );
                        if (!resp.ok) throw new Error("Failed to open app in container");

                        const result = await resp.json();

                        // Extract clean Xpra URL from the response (includes window filtering and no chrome)
                        const step = result.steps?.find((s: any) => s.xpra_url || s.window_id);
                        const streamUrl = step?.xpra_url || `http://localhost:10005/?window=${step?.window_id}` || "http://localhost:10005/";

                        // Open the streaming window with clean URL (no Xpra toolbar/borders)
                        const s = getSettingsPanelSize();
                        openWindow({
                          appId: id,
                          title: app.name,
                          width: s.width,
                          height: s.height,
                          x: s.x,
                          y: s.y,
                          payload: {
                            url: streamUrl,
                            appName: id,
                            hideControls: true,
                            isStreaming: true,
                          },
                        });
                      } catch (e) {
                        console.error("Launch error", e);
                        toast({
                          title: "Launch failed",
                          description:
                            "Could not open the app inside the container. Is the service running?",
                          variant: "destructive",
                        });
                      }
                    };

                    return (
                      <motion.button
                        key={id}
                        onClick={launchAppAndOpenStream}
                        className="group relative grid place-items-center rounded-md hover:bg-gray-100 text-slate-700 border border-gray-200 bg-white shadow-sm"
                        style={{ width: base, height: base }}
                        title={app.name}
                        whileTap={{ scale: 0.92 }}
                        animate={{ scale }}
                        initial={{ opacity: 0, y: 12, scale: 0.8 }}
                        variants={{
                          show: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                              type: "spring",
                              stiffness: 340,
                              damping: 22,
                            },
                          },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                      >
                        <img
                          src={app.icon}
                          alt={app.name}
                          className="w-5 h-5 object-contain"
                        />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {app.name}
                        </span>
                      </motion.button>
                    );
                  })}

                {/* Only pinned app icons are shown in the dock per design */}
              </motion.div>
              {/* Magic Tools button - same icon as ChatPage's magic button */}
              <div className="ml-3 pointer-events-auto relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group p-[2px] rounded-full"
                  onClick={() => setShowAiTools((s) => !s)}
                  title="AI Tools"
                >
                  <div
                    className="absolute inset-0 rounded-full opacity-80 group-hover:opacity-100 blur-sm"
                    style={{
                      background:
                        "conic-gradient(from 0deg, rgba(190,190,190,0.9), rgba(249,115,22,0.95), rgba(190,190,190,0.9))",
                      transition: "opacity 200ms ease-out",
                    }}
                  />
                  <div className="relative p-2 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow-md text-slate-700 backdrop-blur-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 transition-all duration-300 group-hover:rotate-45 group-hover:scale-110"
                    >
                      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
                    </svg>
                  </div>
                </motion.div>
                {/* Panel anchored to this button - opens below the button */}
                <AnimatePresence>
                  {showAiTools && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[70] w-[260px] p-3 rounded-xl border border-border bg-card/90 backdrop-blur-lg shadow-lg text-foreground"
                      style={{ backdropFilter: "blur(8px) saturate(1.05)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-foreground">
                          AI Super powers
                        </div>
                        <button
                          onClick={() => setShowAiTools(false)}
                          className="p-1 rounded-full hover:bg-white/10"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4 text-foreground" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedAiMode("chat");
                          }}
                          className={`w-full text-left px-2 py-2 rounded-md transition flex items-center justify-between ${selectedAiMode === "chat"
                              ? "bg-white/6"
                              : "hover:bg-white/6"
                            }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              Chat Mode
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Start a conversational agent
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedAiMode === "chat" ? "On" : ""}
                          </div>
                        </button>

                        <button
                          onClick={() => setSelectedAiMode("aurion")}
                          className={`w-full text-left px-2 py-2 rounded-md transition flex items-center justify-between ${selectedAiMode === "aurion"
                              ? "bg-white/6"
                              : "hover:bg-white/6"
                            }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              Aurion Layer
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Enable Aurion to Feel Jarvis like AI system.
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedAiMode === "aurion" ? "On" : ""}
                          </div>
                        </button>

                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-foreground">
                              Selected Mode
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-xs text-muted-foreground">
                                Chat
                              </div>
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedAiMode === "aurion"}
                                  onChange={(e) =>
                                    setSelectedAiMode(
                                      e.target.checked ? "aurion" : "chat"
                                    )
                                  }
                                  className="sr-only"
                                />
                                <span
                                  className={`relative inline-block w-12 h-6 bg-white/10 rounded-full transition-colors`}
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${selectedAiMode === "aurion"
                                        ? "translate-x-6"
                                        : "translate-x-0"
                                      }`}
                                  />
                                </span>
                              </label>
                              <div className="text-xs text-muted-foreground">
                                Aurion
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {/* (Old external AI Tools panel removed) */}

          {/* Windows Layer */}
          <div className="absolute inset-0 pt-24 pb-24">
            <AnimatePresence>
              {windows.map((w) => (
                <Rnd
                  key={w.id}
                  size={{
                    width: w.width,
                    height: w.height,
                  }}
                  position={{
                    x: w.x,
                    y: w.y,
                  }}
                  minWidth={320}
                  minHeight={180}
                  bounds="parent"
                  style={{
                    zIndex: w.z,
                    display: w.minimized ? "none" : "block",
                  }}
                  dragHandleClassName="window-drag"
                  cancel=".window-no-drag,.no-drag"
                  onDragStop={(e, d) => {
                    // Snap to sides
                    const edge = 48;
                    const nearLeft = d.x <= edge;
                    const nearRight =
                      window.innerWidth - (d.x + (w.width || 0)) <= edge;
                    if (nearLeft || nearRight) {
                      const half = Math.floor(window.innerWidth / 2) - 16;
                      setWindows((ws) =>
                        ws.map((it) =>
                          it.id === w.id
                            ? {
                              ...it,
                              x: nearLeft ? 8 : half + 8,
                              y: 88,
                              width: half - 16,
                              height: window.innerHeight - 200,
                              z: nextZ(),
                            }
                            : it
                        )
                      );
                    } else {
                      setWindows((ws) =>
                        ws.map((it) =>
                          it.id === w.id ? { ...it, x: d.x, y: d.y } : it
                        )
                      );
                    }
                  }}
                  onResizeStop={(e, dir, ref, delta, pos) => {
                    setWindows((ws) =>
                      ws.map((it) =>
                        it.id === w.id
                          ? {
                            ...it,
                            width: ref.offsetWidth,
                            height: ref.offsetHeight,
                            x: pos.x,
                            y: pos.y,
                          }
                          : it
                      )
                    );
                  }}
                  onMouseDown={() => focusWindow(w.id)}
                >
                  <motion.div
                    className="h-full w-full rounded-[32px] overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.35)] ring-1 ring-white/10 bg-white/5 backdrop-blur-xl text-white relative"
                    initial={{
                      y: 28,
                      opacity: 0,
                      scale: 0.94,
                      filter: "blur(8px)",
                    }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      scale: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.75,
                      y: 40,
                      filter: "blur(12px)",
                    }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Minimal glass title bar */}
                    <div className="window-drag absolute left-0 right-0 top-0 h-11 flex items-center justify-between px-5 text-[15px] font-medium tracking-wide text-white/90 select-none bg-gradient-to-b from-white/40 to-white/10 backdrop-blur-xl">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/60 grid place-items-center text-[11px] font-bold text-slate-700 shadow-sm">
                          {w.title.charAt(0)}
                        </span>
                        {w.title}
                      </span>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeWindow(w.id);
                        }}
                        className="window-no-drag w-8 h-8 grid place-items-center rounded-full hover:bg-white/30 active:scale-90 transition relative"
                        title="Close"
                        whileHover={{ rotate: 90 }}
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 18,
                        }}
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                    {/* Content area */}
                    <div className="absolute inset-0 pt-11">
                      <RemoteChrome
                        payload={w.payload}
                        onClose={() => closeWindow(w.id)}
                      />
                    </div>
                  </motion.div>
                </Rnd>
              ))}
            </AnimatePresence>
          </div>

          {/* App Store disabled for remote-only mode */}

          {/* Settings Panel (opens from User2 icon) */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel
                onClose={() => setShowSettings(false)}
                onApplyWallpaper={(w) => setWallpaper(w)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Outside bottom row: input (center) + user button (right) */}
      <div className="pointer-events-none fixed bottom-6 left-0 right-0">
        <div className="mx-auto flex items-center justify-center">
          <form onSubmit={onSubmit} className="pointer-events-auto aios-input">
            <input
              className="aios-input-field"
              placeholder="Ask something"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button type="submit" className="aios-input-cta" title="Ask">
              <Lightbulb className="w-4 h-4" />
            </button>
          </form>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="pointer-events-auto absolute right-8 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-black/80 hover:bg-black/70 text-white shadow-xl border border-white/10"
          title="Settings"
        >
          <User2 className="w-5 h-5" />
        </button>
      </div>

      {/* SuperAgent Cursor - shows what agent is doing */}
      <AgentCursor position={agentCursor} />
      {/* New dynamic steps panel */}
      <AgentStepsPanel status={agentStatus as any} />
    </div>
  );
};

export default AIOS;

// --- Panels ---
function AppStorePanel({ onClose }: { onClose: () => void }) {
  const catalog = [
    { name: "Firefox", icon: "🦊" },
    { name: "MS Excel", icon: "📊" },
    { name: "MS PowerPoint", icon: "📽️" },
    { name: "MS Teams", icon: "👥" },
    { name: "MS Word", icon: "📄" },
    { name: "New York Times", icon: "📰" },
    { name: "Outlook", icon: "📧" },
    { name: "Personio", icon: "🧑‍💼" },
    { name: "Photoshop", icon: "🖌️" },
    { name: "SAP", icon: "💼" },
    { name: "Shopify", icon: "🛍️" },
    { name: "Spiegel Online", icon: "🟧" },
    { name: "Startpage", icon: "🔍" },
    { name: "Suno", icon: "🎵" },
    { name: "Tagesschau", icon: "🟦" },
    { name: "Vattenfall", icon: "⚡" },
  ];
  return (
    <motion.div
      className="absolute inset-0 z-[80] grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative w-[92%] md:w-[860px] max-h-[78vh] overflow-hidden rounded-[22px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] text-white"
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <div className="px-5 py-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">App Store</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            <input
              className="flex-1 bg-transparent outline-none placeholder-white/65 text-sm"
              placeholder="Search..."
            />
          </div>
        </div>
        <div className="px-3 pb-6 overflow-y-auto max-h-[calc(78vh-112px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catalog.map((app) => (
              <div
                key={app.name}
                className="flex items-center justify-between rounded-xl bg-white/10 border border-white/15 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center w-9 h-9">
                    <span className="text-base">{app.icon}</span>
                  </div>
                  <div className="text-sm font-medium">{app.name}</div>
                </div>
                <button className="grid place-items-center w-8 h-8">
                  <DownloadIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* bottom center avatar bump */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full ring-2 ring-white/70 overflow-hidden shadow-xl">
          <img
            alt="avatar"
            src="https://i.pravatar.cc/96?img=12"
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsPanel({
  onClose,
  onApplyWallpaper,
}: {
  onClose: () => void;
  onApplyWallpaper?: (w: string) => void;
}) {
  const [tab, setTab] = useState<
    "account" | "workspaces" | "payment" | "customization"
  >("account");
  const navRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLButtonElement | null>(null);
  const workspacesRef = useRef<HTMLButtonElement | null>(null);
  const paymentRef = useRef<HTMLButtonElement | null>(null);
  const customizationRef = useRef<HTMLButtonElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  // profile avatar state persisted in localStorage
  const [avatar, setAvatar] = useState<string | null>(() =>
    localStorage.getItem("aios.profile.avatar")
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // controlled account fields
  const [email, setEmail] = useState<string>(
    () => localStorage.getItem("aios.profile.email") || ""
  );
  const [firstName, setFirstName] = useState<string>(
    () => localStorage.getItem("aios.profile.firstName") || ""
  );
  const [lastName, setLastName] = useState<string>(
    () => localStorage.getItem("aios.profile.lastName") || ""
  );
  const [saving, setSaving] = useState(false);
  // profile id: prefer authenticated uid, fallback to local id
  const [profileId, setProfileId] = useState<string | null>(
    () => localStorage.getItem("aios.profile.id") || null
  );
  useEffect(() => {
    const unsub = auth?.onAuthStateChanged?.((u: any) => {
      if (u?.uid) {
        setProfileId(u.uid);
        try {
          localStorage.setItem("aios.profile.id", u.uid);
        } catch { }
      }
    });
    return () => unsub && unsub();
  }, []);

  // load profile avatar from Firestore if available
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      const id = profileId || localStorage.getItem("aios.profile.id");
      if (!id) return;
      try {
        const docRef = doc(db, "profiles", id);
        const snap = await getDoc(docRef);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.avatar) {
            setAvatar(data.avatar);
            try {
              localStorage.setItem("aios.profile.avatar", data.avatar);
            } catch { }
          }
          // populate other account fields if present
          if (data?.email) {
            setEmail(data.email);
            try {
              localStorage.setItem("aios.profile.email", data.email);
            } catch { }
          }
          if (data?.firstName) {
            setFirstName(data.firstName);
            try {
              localStorage.setItem("aios.profile.firstName", data.firstName);
            } catch { }
          }
          if (data?.lastName) {
            setLastName(data.lastName);
            try {
              localStorage.setItem("aios.profile.lastName", data.lastName);
            } catch { }
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  const onPickAvatar = () => fileInputRef.current?.click();
  const onAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const data = String(reader.result || "");
      // show local preview immediately
      setAvatar(data);
      try {
        localStorage.setItem("aios.profile.avatar", data);
      } catch { }

      // ensure we have a profileId
      let id = profileId || localStorage.getItem("aios.profile.id");
      if (!id) {
        id = crypto.randomUUID();
        setProfileId(id);
        try {
          localStorage.setItem("aios.profile.id", id);
        } catch { }
      }

      // NOTE: Storage upload disabled due to CORS. Avatar saved locally only.
      // To enable Firebase Storage uploads, configure CORS on your bucket:
      // 1. Create cors.json: [{"origin":["http://localhost:8080"],"method":["GET","POST","PUT"],"maxAgeSeconds":3600}]
      // 2. Run: gsutil cors set cors.json gs://cognix-1fc5a.appspot.com
      // 3. Uncomment the upload code below

      try {
        toast({ title: "Avatar saved locally" });
        console.log(
          "Avatar saved to localStorage (Firebase Storage upload disabled due to CORS)"
        );
        // Temporarily disabled to avoid CORS errors:
        /*
        const storage = firebaseStorage || getStorage();
        const key = `avatars/${id}-${Date.now()}`;
        const sRef = storageRef(storage, key);
        await uploadString(sRef, data, "data_url");
        const url = await getDownloadURL(sRef);
        const docRef = doc(db, "profiles", id);
        await setDoc(
          docRef,
          { avatar: url, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setAvatar(url);
        try {
          localStorage.setItem("aios.profile.avatar", url);
        } catch {}
        toast({ title: "Avatar uploaded to Firebase" });
        */
      } catch (err) {
        console.error("avatar save", err);
        toast({
          title: "Save failed",
          description: "Could not save avatar locally.",
          variant: "destructive",
        });
      }
    };
    reader.readAsDataURL(f);
    // reset input so the same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // ensure avatar state is mirrored to localStorage so it persists reliably
  useEffect(() => {
    try {
      if (avatar) localStorage.setItem("aios.profile.avatar", avatar);
      else localStorage.removeItem("aios.profile.avatar");
    } catch {
      // ignore storage errors
    }
  }, [avatar]);
  const updateSlider = useCallback(() => {
    const refs = {
      account: accountRef.current,
      workspaces: workspacesRef.current,
      payment: paymentRef.current,
      customization: customizationRef.current,
    } as const;
    const activeEl = refs[tab];
    const container = navRef.current;
    const slider = sliderRef.current;
    if (!activeEl || !container || !slider) return;
    const aRect = activeEl.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    // narrow slider and center it vertically on the active button
    const sliderHeight = Math.max(28, Math.round(activeEl.offsetHeight * 0.6));
    const top =
      aRect.top - cRect.top + activeEl.offsetHeight / 2 - sliderHeight / 2;
    slider.style.transform = `translateY(${Math.max(6, Math.round(top))}px)`;
    slider.style.height = `${sliderHeight}px`;
  }, [tab]);
  useLayoutEffect(() => {
    updateSlider();
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [updateSlider]);

  // ensure wheel events always scroll the panel content (workaround for some environments)
  const handlePanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // forward wheel delta to the scrolling element
    try {
      e.currentTarget.scrollBy({ top: e.deltaY, left: 0, behavior: "auto" });
    } catch (err) {
      // ignore
    }
  };

  // load wallpapers from the AI OS wallpapers folder (Vite glob)
  const wallpaperModules: Record<string, any> = import.meta.glob(
    "/src/AI OS wallpapers/*.{png,jpg,jpeg,webp}",
    { eager: true }
  ) as any;
  const wallpapers: string[] = Object.values(wallpaperModules)
    .map((m: any) => (m && m.default) || m)
    .filter(Boolean);
  return (
    <motion.div
      className="absolute inset-0 z-[85] grid place-items-center"
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{ opacity: 0, scale: 0.995, transition: { duration: 0.28 } }}
    >
      <style>{`
            .no-scrollbar::-webkit-scrollbar{display:none}
            .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}

            /* Glassy thin custom scrollbar for panels */
            .glassy-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.18) rgba(255,255,255,0.04);
            }
            .glassy-scrollbar::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .glassy-scrollbar::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 8px;
            }
            .glassy-scrollbar::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.10));
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.06);
              backdrop-filter: blur(6px);
            }
            .glassy-scrollbar::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.14));
            }
            .glassy-scrollbar::-webkit-scrollbar-corner{background:transparent}
          `}</style>
      <motion.div
        className="relative w-[92%] md:w-[760px] h-[66vh] flex gap-3"
        initial={{ y: 26, opacity: 0, scale: 0.992 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: 1,
          transition: { type: "spring", stiffness: 220, damping: 24 },
        }}
        exit={{
          y: 12,
          opacity: 0,
          scale: 0.992,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 26,
            duration: 0.28,
          },
        }}
      >
        {/* Left navigation (wider to include labels) */}
        <div className="relative flex flex-col justify-between rounded-[28px] border border-white/20 bg-black/10 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.30)] text-white w-[170px] py-3 px-3 h-full">
          <div ref={navRef} className="relative flex flex-col gap-2">
            {/* sliding indicator (narrow and flush to left wall) */}
            <div
              ref={sliderRef}
              className="absolute left-0 -ml-1 w-1 rounded-full bg-white/90 transform transition-transform duration-150"
              style={{
                top: 10,
                height: 24,
                boxShadow: "0 6px 18px rgba(255,255,255,0.12)",
                transform: "translateX(-1px)",
              }}
            />
            <button
              ref={accountRef}
              onClick={() => setTab("account")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 transition`}
              title="Account"
            >
              <div className="w-6 h-6 grid place-items-center">
                <User2 className={`w-5 h-5 text-white`} />
              </div>
              <div className={`text-sm font-medium text-white/90`}>Account</div>
            </button>

            <button
              ref={workspacesRef}
              onClick={() => setTab("workspaces")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 transition`}
              title="Workspaces"
            >
              <div className="w-6 h-6 grid place-items-center">
                <LayoutGrid className={`w-5 h-5 text-white`} />
              </div>
              <div className={`text-sm font-medium text-white/90`}>
                Workspaces
              </div>
            </button>

            <button
              ref={paymentRef}
              onClick={() => setTab("payment")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 transition`}
              title="Payment"
            >
              <div className="w-6 h-6 grid place-items-center">
                <CreditCard className={`w-5 h-5 text-white`} />
              </div>
              <div className={`text-sm font-medium text-white/90`}>Payment</div>
            </button>

            <button
              ref={customizationRef}
              onClick={() => setTab("customization")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition hover:bg-white/06`}
              title="Customization"
            >
              <div className="w-6 h-6 grid place-items-center">
                <Lightbulb className={`w-5 h-5 text-white`} />
              </div>
              <div className={`text-sm font-medium text-white/90`}>
                Customization
              </div>
            </button>
          </div>

          <button
            className="w-full flex items-center gap-3 px-3 py-2 transition"
            title="Logout"
            onClick={() => {
              /* logout hook */
            }}
          >
            <LogOut className="w-5 h-5 text-rose-400 drop-shadow-[0_0_10px_rgba(255,50,50,0.45)]" />
            <span className="text-sm font-medium text-rose-400 drop-shadow-[0_0_10px_rgba(255,50,50,0.45)]">
              Logout
            </span>
          </button>
        </div>

        {/* Main content panel (slightly narrower overall by reducing parent width) */}
        <div className="relative flex-1 rounded-[24px] overflow-hidden border border-white/20 bg-black/28 backdrop-blur-3xl shadow-[0_16px_48px_rgba(0,0,0,0.30)] text-white h-full">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <AnimatePresence mode="wait">
            {tab === "account" && (
              <motion.div
                key="account"
                className="h-full p-4 md:p-6 overflow-y-auto glassy-scrollbar"
                onWheel={handlePanelWheel}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 300, damping: 28 },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              >
                <h3 className="text-[17px] font-semibold mb-1.5">Account</h3>
                <div className="border-b border-white/10 mb-4" />

                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-sky-100 to-sky-100 ring-1 ring-white/20 shadow-md">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-black/90">
                        <User2 className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onPickAvatar}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/14 text-sm"
                      title="Change avatar"
                    >
                      Change avatar
                    </button>
                    {avatar && (
                      <button
                        onClick={async () => {
                          const id =
                            profileId ||
                            localStorage.getItem("aios.profile.id");
                          setAvatar(null);
                          try {
                            localStorage.removeItem("aios.profile.avatar");
                          } catch { }
                          if (id) {
                            try {
                              const docRef = doc(db, "profiles", id);
                              await setDoc(
                                docRef,
                                { avatar: null, updatedAt: serverTimestamp() },
                                { merge: true }
                              );
                              toast({ title: "Avatar removed" });
                            } catch (e) {
                              console.error("remove avatar", e);
                            }
                          }
                        }}
                        className="px-2 py-1.5 rounded-full bg-white/6 hover:bg-white/10 text-sm"
                        title="Remove avatar"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarSelected}
                    className="hidden"
                  />
                </div>

                {/* Email */}
                <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-full bg-white/20 border border-white/25 px-3 py-2 mb-4">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent outline-none placeholder-white/70 text-sm"
                    placeholder="you@example.com"
                  />
                  <Mail className="w-4 h-4 text-white/80" />
                  <button className="w-8 h-8 grid place-items-center rounded-full bg-white/30 hover:bg-white/40 text-slate-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                      Current password
                    </label>
                    <div className="flex items-center rounded-full bg-white/15 border border-white/20 px-4 py-2">
                      <input
                        type="password"
                        className="flex-1 bg-transparent outline-none placeholder-white/60 text-sm"
                        placeholder="••••••••"
                      />
                      <Eye className="w-4 h-4 text-white/80" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                      New password
                    </label>
                    <div className="flex items-center rounded-full bg-white/15 border border-white/20 px-4 py-2">
                      <input
                        type="password"
                        className="flex-1 bg-transparent outline-none placeholder-white/60 text-sm"
                        placeholder="••••••••"
                      />
                      <Eye className="w-4 h-4 text-white/80" />
                    </div>
                  </div>
                </div>

                {/* Personal information */}
                <div className="mt-1 mb-2 text-xs uppercase tracking-wide text-white/60">
                  Personal information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-white/70 mb-1">
                      First name
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm outline-none placeholder-white/60"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/70 mb-1">
                      Last name
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm outline-none placeholder-white/60"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        let id =
                          profileId || localStorage.getItem("aios.profile.id");
                        if (!id) {
                          id = crypto.randomUUID();
                          setProfileId(id);
                          try {
                            localStorage.setItem("aios.profile.id", id);
                          } catch { }
                        }
                        const docRef = doc(db, "profiles", id);
                        const payload: any = {
                          updatedAt: serverTimestamp(),
                        };
                        if (avatar) payload.avatar = avatar;
                        if (email) payload.email = email;
                        if (firstName) payload.firstName = firstName;
                        if (lastName) payload.lastName = lastName;
                        await setDoc(docRef, payload, { merge: true });
                        try {
                          localStorage.setItem(
                            "aios.profile.email",
                            email || ""
                          );
                          localStorage.setItem(
                            "aios.profile.firstName",
                            firstName || ""
                          );
                          localStorage.setItem(
                            "aios.profile.lastName",
                            lastName || ""
                          );
                        } catch { }
                        toast({ title: "Profile saved" });
                      } catch (e) {
                        console.error("save profile", e);
                        toast({ title: "Save failed", variant: "destructive" });
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/14 text-sm"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "workspaces" && (
              <motion.div
                key="workspaces"
                className="h-full p-6 md:p-8 overflow-y-auto glassy-scrollbar"
                onWheel={handlePanelWheel}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 300, damping: 28 },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              >
                <h3 className="text-[18px] font-semibold mb-2">Workspaces</h3>
                <div className="border-b border-white/10 mb-3" />
                <div className="text-sm text-white/80">Coming soon.</div>
              </motion.div>
            )}

            {tab === "payment" && (
              <motion.div
                key="payment"
                className="h-full p-6 md:p-8 overflow-y-auto glassy-scrollbar"
                onWheel={handlePanelWheel}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 300, damping: 28 },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              >
                <h3 className="text-[18px] font-semibold mb-2">Payment</h3>
                <div className="border-b border-white/10 mb-3" />
                <div className="text-sm text-white/80">Coming soon.</div>
              </motion.div>
            )}
            {tab === "customization" && (
              <motion.div
                key="customization"
                className="h-full p-6 md:p-8 overflow-y-auto glassy-scrollbar"
                onWheel={handlePanelWheel}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 300, damping: 28 },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              >
                <h3 className="text-[18px] font-semibold mb-3">
                  Customization
                </h3>
                <div className="border-b border-white/10 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {wallpapers.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        try {
                          localStorage.setItem("aios.wallpaper", w);
                        } catch { }
                        if (onApplyWallpaper) onApplyWallpaper(w);
                        toast({ title: "Wallpaper applied" });
                      }}
                      className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5 p-0"
                      title={`Use wallpaper ${i + 1}`}
                    >
                      <img
                        src={w}
                        alt={`wall-${i}`}
                        className="w-full h-28 object-cover"
                      />
                      <div className="absolute left-2 bottom-2 bg-black/40 px-2 py-1 rounded text-xs">
                        Use
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3v12m0 0l4-4m-4 4l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 21h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
// --- App Renderers ---
function RemoteChrome({
  payload,
  onClose,
}: {
  payload: { url: string; hideControls?: boolean; isStreaming?: boolean };
  onClose?: () => void;
}) {
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const [safeUrl] = useState(payload?.url || "http://localhost:10000/");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // helper to send key combos into the remote Chrome (best-effort)
  const sendKeyCombo = (
    sequence: {
      key: string;
      code?: string;
      altKey?: boolean;
      ctrlKey?: boolean;
    }[]
  ) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const win = iframe.contentWindow;
    if (!win) return;
    sequence.forEach((k) => {
      const evtInit: any = {
        key: k.key,
        code: k.code || k.key,
        altKey: !!k.altKey,
        ctrlKey: !!k.ctrlKey,
        bubbles: true,
        cancelable: true,
      };
      win.dispatchEvent(new KeyboardEvent("keydown", evtInit));
      win.dispatchEvent(new KeyboardEvent("keyup", evtInit));
    });
  };

  const attemptHistory = (delta: number) => {
    try {
      const win = iframeRef.current?.contentWindow;
      // accessing history on cross-origin will throw, so wrap in try/catch
      win?.history?.go(delta);
      return true;
    } catch {
      return false;
    }
  };
  const goBack = () => {
    const ok = attemptHistory(-1);
    if (!ok) {
      // fallback send key combo for remote streaming (Alt+Left / BrowserBack)
      sendKeyCombo([
        { key: "Alt", code: "AltLeft" },
        { key: "ArrowLeft", code: "ArrowLeft", altKey: true },
      ]);
    }
  };
  const goForward = () => {
    const ok = attemptHistory(1);
    if (!ok) {
      sendKeyCombo([
        { key: "Alt", code: "AltLeft" },
        { key: "ArrowRight", code: "ArrowRight", altKey: true },
      ]);
    }
  };
  const refresh = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      win?.location?.reload();
    } catch {
      // Force reload by resetting src (cross-origin safe)
      if (iframeRef.current) iframeRef.current.src = safeUrl;
      else sendKeyCombo([{ key: "F5", code: "F5" }]);
    }
  };

  useEffect(() => {
    // Test connection to the streaming service
    const testConnection = async () => {
      try {
        const response = await fetch(safeUrl, { mode: "no-cors" });
        setConnectionStatus("connected");
      } catch {
        setConnectionStatus("error");
      }
    };

    testConnection();
    const interval = setInterval(testConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [safeUrl]);

  return (
    <div className="h-full w-full group relative">
      {/* Hover controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/60 shadow backdrop-blur-md text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={goBack}
          className="w-7 h-7 grid place-items-center rounded-full hover:bg-black/10"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goForward}
          className="w-7 h-7 grid place-items-center rounded-full hover:bg-black/10"
          title="Forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={refresh}
          className="w-7 h-7 grid place-items-center rounded-full hover:bg-black/10"
          title="Refresh"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-7 h-7 grid place-items-center rounded-full hover:bg-red-500/20 focus:outline-none"
            title="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div
          className={`ml-1 w-2 h-2 rounded-full ${connectionStatus === "connected"
              ? "bg-green-500"
              : connectionStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            }`}
          title={connectionStatus}
        />
      </div>
      {/* Iframe area */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.992, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {connectionStatus === "connected" ? (
          <div className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              title="Remote Chrome Stream"
              src={safeUrl}
              className="w-full h-full border-none"
              style={{ background: "#fff" }}
              allow="camera; microphone; display-capture"
            />
            {/* Hover working overlay (only when agent active) */}
            {/* Overlay needs global agentStatus; access via window or lift prop later */}
            {(window as any).agentStatus?.isActive && !isCancelling && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
                <div className="mb-12 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  <div className="relative px-10 py-8 rounded-[32px] bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl text-slate-800 shadow-2xl border border-white/70 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-pulse [animation-delay:120ms]" />
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-pulse [animation-delay:240ms]" />
                    </div>
                    <p className="text-sm font-medium tracking-wide">Your assistant is currently working</p>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setIsCancelling(true);
                        try {
                          await fetch('/api/superagent/cancel', { method: 'POST' });
                          (window as any).simpleAgentBridge?.cancelCurrentTask?.();
                          // Wait a moment for backend to process
                          await new Promise(resolve => setTimeout(resolve, 800));
                        } catch (err) {
                          console.error('Cancel failed:', err);
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      className="pointer-events-auto select-none rounded-full px-6 py-2 bg-black text-white text-sm font-semibold shadow hover:bg-black/90 active:scale-95 transition"
                    >
                      Take over control
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Cancelling overlay */}
            {isCancelling && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
                <div className="mb-12">
                  <div className="relative px-10 py-8 rounded-[32px] bg-gradient-to-b from-red-500/90 to-red-600/90 backdrop-blur-xl text-white shadow-2xl border border-red-400/50 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                    <p className="text-sm font-semibold tracking-wide">Cancelling...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : connectionStatus === "connecting" ? (
          <div className="flex items-center justify-center h-full text-center text-white/80">
            <div className="space-y-4">
              <div className="animate-spin w-10 h-10 border-2 border-white/30 border-t-white rounded-full mx-auto" />
              <div className="text-sm">
                <p>Connecting…</p>
                <p className="text-xs opacity-70 mt-1">Waiting for stream</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-white/80">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-sm">
                <p>Stream unavailable</p>
                <button
                  onClick={() => setConnectionStatus("connecting")}
                  className="mt-3 px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-xs"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// removed Notepad/Browser/WhatsApp stubs for remote-only mode
