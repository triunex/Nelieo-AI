import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type ArsenalConfig = {
  features: {
    deepResearch: boolean;
    smartSearch: boolean;
    explainLikePhD: boolean;
    judge?: boolean;
    contrarian?: boolean;
  };
  apps: {
    gmail: boolean;
    reddit: boolean;
    twitter: boolean;
    youtube: boolean;
    notion: boolean;
    whatsapp: boolean;
  };
};

export type UserInstructions = {
  search: string;
  chat: string;
  arsenal: string;
};

type Ctx = {
  config: ArsenalConfig | null;
  loading: boolean;
  save: (cfg: ArsenalConfig) => Promise<void>;
  refresh: () => Promise<void>;
  instructions: UserInstructions;
  saveInstructions: (ins: UserInstructions) => Promise<void>;
};

const ArsenalContext = createContext<Ctx>({
  config: null,
  loading: false,
  save: async () => {},
  refresh: async () => {},
  instructions: { search: "", chat: "", arsenal: "" },
  saveInstructions: async () => {},
});
export const useArsenal = () => useContext(ArsenalContext);

export const ArsenalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Provide an immediate default so UI never stuck on null
  const defaultConfig: ArsenalConfig = {
    features: {
      deepResearch: false,
      smartSearch: true,
      explainLikePhD: false,
      judge: false,
      contrarian: false,
    },
    apps: {
      gmail: false,
      reddit: false,
      twitter: false,
      youtube: false,
      notion: false,
      whatsapp: false,
    },
  };
  const [config, setConfig] = useState<ArsenalConfig | null>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<UserInstructions>({
    search: "",
    chat: "",
    arsenal: "",
  });
  // Track last seen user id so we can refetch instructions if auth changes after mount
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      const userId = (window as any).__COGNIX_USER_ID__ || "demo";
      const resp = await fetch(
        "https://cognix-api.onrender.com/api/arsenal-config",
        {
          headers: { "x-user-id": userId },
        }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      // Guard against non-JSON (e.g. dev server index.html when proxy missing)
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Non-JSON response (check dev proxy / backend)");
      }
      if (json?.config) {
        setConfig(json.config);
      } else {
        // keep default but record anomaly
        setLastError("Config missing in response; using defaults");
      }
    } catch (e: any) {
      console.warn("Arsenal config fetch failed, using defaults", e);
      setConfig((prev) => prev || defaultConfig);
      setLastError(e.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (cfg: ArsenalConfig) => {
    setLoading(true);
    setLastError(null);
    try {
      const userId = (window as any).__COGNIX_USER_ID__ || "demo";
      const resp = await fetch(
        "https://cognix-api.onrender.com/api/arsenal-config",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({ config: cfg }),
        }
      );
      if (!resp.ok) throw new Error(`Save failed HTTP ${resp.status}`);
      setConfig(cfg);
    } catch (e: any) {
      setLastError(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load instructions from backend or localStorage
  const loadInstructions = useCallback(async () => {
    try {
      // Try backend first (use same render base the app uses)
      const RENDER_BASE =
        (window as any).__COGNIX_RENDER_BASE__ ||
        "https://cognix-api.onrender.com";
      const userId = (window as any).__COGNIX_USER_ID__ || "demo";
      const resp = await fetch(`${RENDER_BASE}/api/instructions/${userId}`, {
        headers: { "x-user-id": userId },
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j?.instructions) {
          setInstructions(j.instructions);
          try {
            (window as any).__COGNIX_INSTRUCTIONS__ = j.instructions;
          } catch {}
          // mirror to localStorage
          try {
            localStorage.setItem(
              "cognix_instructions",
              JSON.stringify(j.instructions)
            );
          } catch {}
          return;
        }
      }
    } catch (e) {
      // ignore and fallback to localStorage
    }
    try {
      const raw = localStorage.getItem("cognix_instructions");
      if (raw) {
        const parsed = JSON.parse(raw);
        setInstructions(parsed);
        try {
          (window as any).__COGNIX_INSTRUCTIONS__ = parsed;
        } catch {}
      }
    } catch {}
  }, []);

  const saveInstructions = useCallback(async (ins: UserInstructions) => {
    setLastError(null);
    try {
      // optimistic local update
      setInstructions(ins);
      try {
        localStorage.setItem("cognix_instructions", JSON.stringify(ins));
        try {
          (window as any).__COGNIX_INSTRUCTIONS__ = ins;
        } catch {}
      } catch {}
      const RENDER_BASE =
        (window as any).__COGNIX_RENDER_BASE__ ||
        "https://cognix-api.onrender.com";
      const userId = (window as any).__COGNIX_USER_ID__ || "demo";
      const resp = await fetch(`${RENDER_BASE}/api/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ userId, instructions: ins }),
      });
      if (!resp.ok) throw new Error(`Save failed ${resp.status}`);
      return;
    } catch (e: any) {
      setLastError(e.message || "Save instructions failed");
    }
  }, []);

  useEffect(() => {
    refresh();
    loadInstructions();
  }, [refresh]);

  // Detect late-arriving auth user id changes (e.g., Firebase sets window.__COGNIX_USER_ID__ after initial mount)
  useEffect(() => {
    const checkId = () => {
      const uid = (window as any).__COGNIX_USER_ID__ || "demo";
      if (uid !== currentUserId) {
        setCurrentUserId(uid);
        // Re-load instructions for the new user id
        loadInstructions();
      }
    };
    // Initial sync
    checkId();
    const interval = setInterval(checkId, 3000); // light poll; inexpensive and avoids adding auth SDK coupling here
    return () => clearInterval(interval);
  }, [currentUserId, loadInstructions]);

  return (
    <ArsenalContext.Provider
      value={{ config, loading, save, refresh, instructions, saveInstructions }}
    >
      {children}
      {/* Optional dev footer for debugging (invisible unless error) */}
      {lastError && (
        <div style={{ display: "none" }} data-arsenal-error={lastError} />
      )}
    </ArsenalContext.Provider>
  );
};
