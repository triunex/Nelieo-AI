import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="group relative w-10 h-10 rounded-full p-0 transition-all duration-500 ease-in-out hover:bg-white/10 dark:hover:bg-white/5 light:hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none overflow-hidden"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 ease-in-out ${
          theme === "light"
            ? "bg-gradient-to-br from-orange-400/20 to-yellow-400/20 scale-0 group-hover:scale-100"
            : "bg-gradient-to-br from-blue-500/20 to-purple-500/20 scale-0 group-hover:scale-100"
        }`}
      />

      {/* Icon container with rotation animation */}
      <div className="relative flex items-center justify-center w-full h-full z-10">
        {/* Sun icon */}
        <Sun
          className={`absolute h-5 w-5 transition-all duration-500 ease-in-out ${
            theme === "light"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-180 scale-0 opacity-0"
          } text-orange-500 drop-shadow-sm`}
        />

        {/* Moon icon */}
        <Moon
          className={`absolute h-5 w-5 transition-all duration-500 ease-in-out ${
            theme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-180 scale-0 opacity-0"
          } text-blue-400 drop-shadow-sm`}
        />
      </div>

      {/* Subtle glow effect */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
          theme === "light"
            ? "shadow-[0_0_20px_rgba(249,115,22,0.3)] opacity-0 group-hover:opacity-100"
            : "shadow-[0_0_20px_rgba(59,130,246,0.3)] opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 scale-0 opacity-0 transition-all duration-300 group-active:scale-110 group-active:opacity-100" />
    </Button>
  );
};

export default ThemeToggle;
