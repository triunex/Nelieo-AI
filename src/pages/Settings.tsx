import { Monitor, Moon, Sun, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useTheme } from "@/contexts/ThemeContext";

const themes = [
  { name: "System", icon: <Monitor className="w-5 h-5" />, value: "system" },
  { name: "Dark", icon: <Moon className="w-5 h-5" />, value: "dark" },
  { name: "Light", icon: <Sun className="w-5 h-5" />, value: "light" },
];

const Settings = () => {
  const { theme: currentTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 transition-colors">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          className="text-3xl font-bold flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Settings2 className="w-7 h-7 text-purple-400" />
          Settings
        </motion.h1>

        {/* Appearance (moved to Profile page) */}
        <div className="mb-10 bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">🎨 Appearance</h2>
          <div className="text-sm text-muted-foreground">
            Theme controls have been moved to your Profile page under
            Appearance.
          </div>
        </div>

        {/* Voice Settings */}
        <div className="mb-10 bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">🔊 Voice Assistant</h2>
          <div className="text-sm text-muted-foreground">
            In future, you'll be able to set preferred voice, speed, and
            language here.
          </div>
        </div>

        {/* Profile / Account */}
        <div className="mb-10 bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">👤 Profile Settings</h2>
          <div className="text-sm text-muted-foreground">
            Soon you'll be able to update your name, avatar, email preferences,
            and password here.
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">🔔 Notifications</h2>
          <div className="text-sm text-muted-foreground">
            We’ll let you enable updates and alerts from CogniX when available.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
