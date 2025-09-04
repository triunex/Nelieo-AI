import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  const resolvedTheme = useMemo<"light" | "dark">(() => {
    if (theme === "system") {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);

    if (resolvedTheme === "light") {
      // Softer off-white background to match light design
      root.style.setProperty("--background", "210 40% 98%");
      root.style.setProperty("--foreground", "222.2 84% 4.9%");
      root.style.setProperty("--card", "0 0% 100%");
      root.style.setProperty("--card-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--popover", "0 0% 100%");
      root.style.setProperty("--popover-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--primary", "262 83.3% 57.8%");
      root.style.setProperty("--primary-foreground", "210 40% 98%");
      root.style.setProperty("--secondary", "210 40% 96%");
      root.style.setProperty("--secondary-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--muted", "210 40% 96%");
      root.style.setProperty("--muted-foreground", "215.4 16.3% 46.9%");
      root.style.setProperty("--accent", "210 40% 96%");
      root.style.setProperty("--accent-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--destructive", "0 84.2% 60.2%");
      root.style.setProperty("--destructive-foreground", "210 40% 98%");
      root.style.setProperty("--border", "214.3 31.8% 91.4%");
      root.style.setProperty("--input", "214.3 31.8% 91.4%");
      root.style.setProperty("--ring", "263.4 70% 50.4%");
    } else {
      root.style.setProperty("--background", "240 10% 3.9%");
      root.style.setProperty("--foreground", "0 0% 98%");
      root.style.setProperty("--card", "240 10% 3.9%");
      root.style.setProperty("--card-foreground", "0 0% 98%");
      root.style.setProperty("--popover", "240 10% 3.9%");
      root.style.setProperty("--popover-foreground", "0 0% 98%");
      root.style.setProperty("--primary", "262 83.3% 57.8%");
      root.style.setProperty("--primary-foreground", "210 40% 98%");
      root.style.setProperty("--secondary", "217.2 32.6% 17.5%");
      root.style.setProperty("--secondary-foreground", "210 40% 98%");
      root.style.setProperty("--muted", "217.2 32.6% 17.5%");
      root.style.setProperty("--muted-foreground", "215 20.2% 65.1%");
      root.style.setProperty("--accent", "217.2 32.6% 17.5%");
      root.style.setProperty("--accent-foreground", "210 40% 98%");
      root.style.setProperty("--destructive", "0 62.8% 30.6%");
      root.style.setProperty("--destructive-foreground", "210 40% 98%");
      root.style.setProperty("--border", "217.2 32.6% 17.5%");
      root.style.setProperty("--input", "217.2 32.6% 17.5%");
      root.style.setProperty("--ring", "263.4 70% 50.4%");
    }

    let mql: MediaQueryList | null = null;
    const handleChange = () => {
      if (theme === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        root.classList.toggle("dark", prefersDark);
        root.classList.toggle("light", !prefersDark);
      }
    };
    if (theme === "system" && window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      try {
        mql.addEventListener("change", handleChange);
      } catch {
        mql.addListener(handleChange);
      }
    }
    return () => {
      if (mql) {
        try {
          mql.removeEventListener("change", handleChange);
        } catch {
          mql.removeListener(handleChange as any);
        }
      }
    };
  }, [resolvedTheme, theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
