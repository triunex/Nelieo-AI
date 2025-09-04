import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Rnd } from "react-rnd";
import {
  Plus,
  X,
  LayoutGrid,
  Wand2,
  Settings as SettingsIcon,
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
} from "lucide-react";
// import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ui/ThemeToggle";
import bgGalaxy from "@/assets/bg-galaxy.jpg";
import { motion, AnimatePresence } from "framer-motion";

type AppId =
  | "remoteChrome"
  | "remoteNotion"
  | "remoteGmail"
  | "remoteInstagram"
  | "remoteFacebook";

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
  const [showAppPicker, setShowAppPicker] = useState(false);
  // const [showAppStore, setShowAppStore] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [command, setCommand] = useState("");
  const [pinned, setPinned] = useState<AppId[]>(() => {
    try {
      const saved = localStorage.getItem("aios.pinned");
      return saved
        ? (JSON.parse(saved) as AppId[])
        : [
            "remoteChrome",
            "remoteNotion",
            "remoteGmail",
            "remoteInstagram",
            "remoteFacebook",
          ];
    } catch {
      return [
        "remoteChrome",
        "remoteNotion",
        "remoteGmail",
        "remoteInstagram",
        "remoteFacebook",
      ];
    }
  });
  const [windows, setWindows] = useState<WindowState[]>([]);
  const nextZ = useZCounter();

  // Dock hover magnification state
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockHoverX, setDockHoverX] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("aios.pinned", JSON.stringify(pinned));
  }, [pinned]);

  // Only allow remote streaming apps in the dock
  const ALLOWED_DOCK = useMemo(
    () =>
      new Set<AppId>([
        "remoteChrome",
        "remoteNotion",
        "remoteGmail",
        "remoteInstagram",
        "remoteFacebook",
      ]),
    []
  );
  useEffect(() => {
    setPinned((p) => {
      const filtered = p.filter((id) => ALLOWED_DOCK.has(id));
      return filtered.length
        ? filtered
        : [
            "remoteChrome",
            "remoteNotion",
            "remoteGmail",
            "remoteInstagram",
            "remoteFacebook",
          ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("aios.wallpaper", wallpaper);
  }, [wallpaper]);

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
        appId: (partial.appId || "remoteChrome") as AppId,
        title: partial.title || "Window",
        x: partial.x ?? 120 + Math.random() * 60,
        y: partial.y ?? 120 + Math.random() * 60,
        width: partial.width ?? 920,
        height: partial.height ?? 600,
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

  // Arrange remote windows side-by-side (simple tiling) similar to provided mock
  const tileRemote = (ws: WindowState[]) => {
    const remotes = ws.filter(
      (r) => r.appId === "remoteChrome" && !r.minimized
    );
    if (remotes.length === 0) return ws;
    const pad = 32;
    const topOffset = 96; // below dock
    const availableWidth = window.innerWidth - pad * 2;
    const maxHeight = Math.min(640, window.innerHeight - 240);
    const perWidth = Math.min(
      1100,
      Math.floor(availableWidth / remotes.length) - 24
    );
    remotes.forEach((w, i) => {
      w.x = pad + i * (perWidth + 24);
      w.y = topOffset;
      w.width = perWidth;
      w.height = maxHeight;
    });
    return ws.map((w) => (w.appId === "remoteChrome" ? { ...w } : w));
  };

  const APPS: Record<AppId, AppDefinition> = useMemo(
    () => ({
      remoteChrome: {
        id: "remoteChrome",
        name: "Chrome",
        icon: "https://www.google.com/chrome/static/images/favicons/favicon-96x96.png",
        launch: (open) =>
          open({
            appId: "remoteChrome",
            title: "Remote Chrome - Streaming Browser",
            width: 1200,
            height: 750,
            payload: {
              url: "http://localhost:10000/",
              hideControls: true,
              isStreaming: true,
            },
          }),
      },
      remoteNotion: {
        id: "remoteNotion",
        name: "Notion",
        icon: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg",
        launch: (open) =>
          open({
            appId: "remoteChrome",
            title: "Notion",
            width: 1200,
            height: 750,
            payload: {
              url: "http://localhost:10001/",
              hideControls: true,
              isStreaming: true,
            },
          }),
      },
      remoteGmail: {
        id: "remoteGmail",
        name: "Gmail",
        // use a colored PNG to avoid white-on-white SVG issues in the white dock
        icon: "https://www.gstatic.com/images/branding/product/1x/gmail_48dp.png",
        launch: (open) =>
          open({
            appId: "remoteChrome",
            title: "Gmail (Remote)",
            width: 1200,
            height: 750,
            payload: {
              url: "http://localhost:10002/",
              hideControls: true,
              isStreaming: true,
            },
          }),
      },
      remoteInstagram: {
        id: "remoteInstagram",
        name: "Instagram",
        icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
        launch: (open) =>
          open({
            appId: "remoteChrome",
            title: "Instagram (Remote)",
            width: 1000,
            height: 700,
            payload: {
              url: "http://localhost:10003/",
              hideControls: true,
              isStreaming: true,
            },
          }),
      },
      remoteFacebook: {
        id: "remoteFacebook",
        name: "Facebook",
        icon: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
        launch: (open) =>
          open({
            appId: "remoteChrome",
            title: "Facebook (Remote)",
            width: 1200,
            height: 750,
            payload: {
              url: "http://localhost:10004/",
              hideControls: true,
              isStreaming: true,
            },
          }),
      },
    }),
    []
  );

  // Minimal command executor: only open remote apps by name
  const runCommand = async (text: string) => {
    const t = text.trim();
    if (!t) return;

    // Optimistically check if it's a simple app open command first
    const appId = (Object.keys(APPS) as AppId[]).find((k) =>
      t.toLowerCase().includes(k.replace("remote", "").toLowerCase())
    );

    if (appId && t.toLowerCase().startsWith("open")) {
      APPS[appId].launch(openWindow);
      return;
    }

    // If not a simple "open" command, send to the agent
    try {
      const AGENT_BASE =
        (import.meta as any).env?.VITE_AGENT_URL || "http://localhost:10000";
      const agentEndpoint = `${String(AGENT_BASE).replace(
        /\/$/,
        ""
      )}/agent/v1/execute`;

      const response = await fetch(agentEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: t,
          config: {
            max_steps: 10,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Agent returned an error");
      }

      const result = await response.json();
      toast({
        title: "Agent Task Complete",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">
              {JSON.stringify(result, null, 2)}
            </code>
          </pre>
        ),
      });
    } catch (error) {
      console.error("Error communicating with agent:", error);
      toast({
        title: "Agent Error",
        description:
          error instanceof Error
            ? error.message
            : "Could not connect to the agent service.",
        variant: "destructive",
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
                {pinned
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
                    return (
                      <motion.button
                        key={id}
                        onClick={() => app.launch(openWindow)}
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

                {/* Quick Add for remote apps only */}
                <div className="mx-1 h-8 w-px bg-gray-200" />
                <button
                  onClick={() => setShowAppPicker((v) => !v)}
                  className="grid place-items-center w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 shadow-sm"
                  title="Quick add"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {showAppPicker && (
                  <div className="absolute top-full right-0 mt-2 min-w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    {(
                      [
                        "remoteChrome",
                        "remoteNotion",
                        "remoteGmail",
                        "remoteInstagram",
                        "remoteFacebook",
                      ] as AppId[]
                    )
                      .map((id) => APPS[id])
                      .map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            setPinned((p) =>
                              Array.from(new Set([...p, app.id]))
                            );
                            setShowAppPicker(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-lg hover:bg-gray-100 text-slate-700 text-sm"
                        >
                          <img
                            src={app.icon}
                            alt={app.name}
                            className="w-6 h-6 object-contain"
                          />
                          {app.name}
                        </button>
                      ))}
                  </div>
                )}

                {/* Compact controls */}
                <div className="mx-1 h-8 w-px bg-gray-200" />
                <button
                  className="grid place-items-center w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 shadow-sm"
                  title="Arrange windows"
                  onClick={() => {
                    const cols = Math.ceil(
                      Math.sqrt(Math.max(1, windows.length))
                    );
                    const rows = Math.ceil(windows.length / cols);
                    const pad = 16;
                    const ww = window.innerWidth - pad * 2;
                    const wh = window.innerHeight - pad * 2 - 140;
                    const cw = Math.max(360, Math.floor(ww / cols) - pad);
                    const ch = Math.max(240, Math.floor(wh / rows) - pad);
                    setWindows((ws) =>
                      ws.map((w, i) => {
                        const c = i % cols;
                        const r = Math.floor(i / cols);
                        return {
                          ...w,
                          x: pad + c * (cw + pad),
                          y: 88 + r * (ch + pad),
                          width: cw,
                          height: ch,
                        };
                      })
                    );
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <div className="grid place-items-center w-9 h-9 text-slate-700">
                  <ThemeToggle />
                </div>
                <button
                  className="grid place-items-center w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 shadow-sm"
                  title="Appearance"
                  onClick={() => setShowAppearance((v) => !v)}
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </motion.div>
            </div>

            {/* Appearance Panel */}
            {showAppearance && (
              <div className="pointer-events-auto mx-auto w-[92%] md:w-[80%] mt-2 rounded-2xl border border-white/15 bg-black/50 backdrop-blur-xl shadow-2xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-300" />
                    <h3 className="font-semibold">Appearance</h3>
                  </div>
                  <button
                    onClick={() => setShowAppearance(false)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-sm mb-2 opacity-80">Quick wallpapers</p>
                    <div className="grid grid-cols-3 gap-3">
                      {DEFAULT_WALLPAPERS.filter(
                        (w, i, arr) => arr.indexOf(w) === i
                      ).map((w, idx) => (
                        <button
                          key={`${idx}-${
                            typeof w === "string" ? w.slice(0, 24) : "grad"
                          }`}
                          onClick={() => setWallpaperInput(w)}
                          className="rounded-xl border border-white/10 overflow-hidden group"
                        >
                          <div
                            className="h-16 w-full"
                            style={
                              w.startsWith("linear-gradient")
                                ? { backgroundImage: w }
                                : {
                                    backgroundImage: `url(${w})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }
                            }
                          />
                          <div className="p-2 text-xs text-center bg-black/30 group-hover:bg-black/50">
                            Select
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-full md:w-80">
                    <p className="text-sm mb-2 opacity-80">
                      Custom image URL or CSS gradient
                    </p>
                    <input
                      className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm focus:outline-none"
                      placeholder="https://... or linear-gradient(...)"
                      defaultValue={wallpaper}
                      onBlur={(e) => setWallpaperInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

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
                      {w.appId === "remoteChrome" && (
                        <RemoteChrome
                          payload={w.payload}
                          onClose={() => closeWindow(w.id)}
                        />
                      )}
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
              <SettingsPanel onClose={() => setShowSettings(false)} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Outside bottom row: input (center) + user button (right) */}
      <div className="pointer-events-none absolute bottom-6 left-0 right-0">
        <div className="mx-auto flex items-center justify-center">
          <form onSubmit={onSubmit} className="pointer-events-auto aios-input">
            <input
              className="aios-input-field"
              placeholder="Ask something"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button type="submit" className="aios-input-cta" title="Ask">
              <Lightbulb className="w-5 h-5" />
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
          <div className="flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2">
            <input
              className="flex-1 bg-transparent outline-none placeholder-white/70 text-sm"
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
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-white/15 border border-white/15">
                    <span className="text-base">{app.icon}</span>
                  </div>
                  <div className="text-sm font-medium">{app.name}</div>
                </div>
                <button className="grid place-items-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 border border-white/30">
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

function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[85] grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92%] md:w-[980px] max-h-[78vh] grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* left frosted menu */}
        <div className="rounded-[22px] overflow-hidden border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] text-white">
          <div className="p-4 flex items-center gap-3 border-b border-white/15">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img
                src="https://i.pravatar.cc/96?img=68"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm font-medium">Account</div>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {[
              "Account",
              "Workspaces",
              "Payment",
              "Support",
              "Bug report",
              "Live Chat",
            ].map((item) => (
              <div
                key={item}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 cursor-pointer"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        {/* right content */}
        <div className="relative rounded-[22px] overflow-hidden border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] text-white">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1 rounded hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-4">
            <h3 className="text-[15px] font-semibold mb-3">Workspaces</h3>
            <div className="space-y-3">
              {[
                "Josh | Marketing",
                "Mara | Sales agent",
                "Eva | Customer support",
                "Unused workspace",
              ].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-xl bg-white/10 border border-white/15 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden">
                      <img
                        src="https://i.pravatar.cc/96?img=32"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm">{row}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs">
                      Archive
                    </button>
                    <button className="px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
          className={`ml-1 w-2 h-2 rounded-full ${
            connectionStatus === "connected"
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
          <iframe
            ref={iframeRef}
            title="Remote Chrome Stream"
            src={safeUrl}
            className="w-full h-full border-none"
            style={{ background: "#fff" }}
            allow="camera; microphone; display-capture"
          />
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
