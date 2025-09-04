import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Camera,
  User,
  Save,
  Bell,
  Globe,
  Shield,
  Key,
  UserCog,
  PenSquare,
  BookOpen,
  Clock,
  BellRing,
  Link2,
  LayoutDashboard,
  Award,
  Languages,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { useArsenal } from "../context/ArsenalContext";
// theme is managed by ThemeContext now

// ---------------- Types & Defaults ----------------
type ProfileData = {
  fullName: string;
  jobTitle: string;
  bio: string;
  hobbies: string;
  workLife: string;
  avatarUrl: string | null;
  location?: string;
  website?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  skills?: string[];
  interests?: string[];
  notifications?: {
    email: boolean;
    app: boolean;
    marketing: boolean;
  };
  theme?: "dark" | "light" | "system";
  language?: string;
  timezone?: string;
};

const defaultProfile: ProfileData = {
  fullName: "",
  jobTitle: "",
  bio: "",
  hobbies: "",
  workLife: "",
  avatarUrl: null,
  location: "",
  website: "",
  social: {
    twitter: "",
    linkedin: "",
    github: "",
  },
  skills: [],
  interests: [],
  notifications: {
    email: true,
    app: true,
    marketing: false,
  },
  theme: "system",
  language: "English",
  timezone: "GMT-0",
};

// ---------------- Component ----------------
const Profile = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [arsenalTab, setArsenalTab] = useState<"features" | "apps">("features");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  // Language / Timezone UI helpers
  const [languageFilter, setLanguageFilter] = useState("");
  const [timezoneFilter, setTimezoneFilter] = useState("");

  const languagesList = [
    { code: "en", name: "English", native: "English" },
    { code: "es", name: "Spanish", native: "Español" },
    { code: "fr", name: "French", native: "Français" },
    { code: "de", name: "German", native: "Deutsch" },
    { code: "zh", name: "Mandarin", native: "普通话" },
    { code: "ja", name: "Japanese", native: "日本語" },
    { code: "pt", name: "Portuguese", native: "Português" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
  ];

  const timezonesList = [
    {
      value: "GMT-8",
      label: "Pacific Time (Los Angeles)",
      offset: "GMT-08:00",
    },
    { value: "GMT-7", label: "Mountain Time (Phoenix)", offset: "GMT-07:00" },
    { value: "GMT-6", label: "Central Time (Chicago)", offset: "GMT-06:00" },
    { value: "GMT-5", label: "Eastern Time (New York)", offset: "GMT-05:00" },
    {
      value: "GMT+0",
      label: "Coordinated Universal Time (London)",
      offset: "GMT+00:00",
    },
    {
      value: "GMT+1",
      label: "Central European Time (Paris)",
      offset: "GMT+01:00",
    },
    {
      value: "GMT+5:30",
      label: "India Standard Time (Mumbai)",
      offset: "GMT+05:30",
    },
    {
      value: "GMT+8",
      label: "China Standard Time (Beijing)",
      offset: "GMT+08:00",
    },
  ];

  const filteredLanguages = languagesList.filter(
    (l) =>
      l.name.toLowerCase().includes(languageFilter.toLowerCase()) ||
      l.native.toLowerCase().includes(languageFilter.toLowerCase())
  );

  const filteredTimezones = timezonesList.filter(
    (t) =>
      t.label.toLowerCase().includes(timezoneFilter.toLowerCase()) ||
      t.offset.toLowerCase().includes(timezoneFilter.toLowerCase()) ||
      t.value.toLowerCase().includes(timezoneFilter.toLowerCase())
  );
  const {
    theme: currentTheme,
    setTheme: setThemeContext,
    resolvedTheme,
  } = useTheme();
  const isLight = resolvedTheme === "light";
  const cardBg = isLight ? "bg-card" : "bg-black/20";
  const overlayBg = isLight ? "bg-white/60" : "bg-black/50";
  const iconClass = isLight ? "text-foreground" : "text-white";

  // Arsenal panel (top-level inside component)
  const ArsenalPanel: React.FC = () => {
    const { config, save, loading } = useArsenal();
    const [local, setLocal] = React.useState(config);
    React.useEffect(() => {
      setLocal(config);
    }, [config]);
    if (!local) return <div>Loading Arsenal...</div>;
    const update = (path: string, value: boolean) => {
      const next: any = structuredClone(local);
      const [root, key] = path.split(".");
      next[root][key] = value;
      setLocal(next);
    };
    return (
      <div className="rounded-xl border p-4 space-y-4">
        <h2 className="text-lg font-semibold">Arsenal Add‑ons</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded bg-gray-100 dark:bg-white/10">
            Features
          </span>
          <span className="px-3 py-1 rounded bg-gray-50 dark:bg-white/5">
            Apps
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["features.deepResearch", "Deep Research"],
            ["features.smartSearch", "Smart Search (Agentic v2)"],
            ["features.explainLikePhD", "Think Like PhD"],
            ["features.judge", "Think Like Supreme Judge"],
            ["features.contrarian", "The Reality"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 border rounded p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={
                  (key === "features.deepResearch" &&
                    local.features.deepResearch) ||
                  (key === "features.smartSearch" &&
                    local.features.smartSearch) ||
                  (key === "features.explainLikePhD" &&
                    local.features.explainLikePhD) ||
                  (key === "features.judge" && local.features.judge) ||
                  (key === "features.contrarian" && local.features.contrarian)
                }
                onChange={(e) => update(key as string, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["apps.gmail", "Gmail"],
            ["apps.reddit", "Reddit"],
            ["apps.twitter", "Twitter / X"],
            ["apps.youtube", "YouTube"],
            ["apps.notion", "Notion"],
            ["apps.whatsapp", "WhatsApp"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 border rounded p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={
                  (key === "apps.gmail" && local.apps.gmail) ||
                  (key === "apps.reddit" && local.apps.reddit) ||
                  (key === "apps.twitter" && local.apps.twitter) ||
                  (key === "apps.youtube" && local.apps.youtube) ||
                  (key === "apps.notion" && local.apps.notion) ||
                  (key === "apps.whatsapp" && local.apps.whatsapp)
                }
                onChange={(e) => update(key as string, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          className="px-4 py-2 rounded bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition disabled:opacity-60"
          disabled={loading}
          onClick={() => local && save(local)}
        >
          {loading ? "Saving..." : "Save Arsenal"}
        </button>
      </div>
    );
  };

  // ---------------- AI Instructions Editor ----------------
  const InstructionsEditor: React.FC = () => {
    const { instructions } = useArsenal();
    const [local, setLocal] = React.useState(instructions);
    React.useEffect(() => setLocal(instructions), [instructions]);
    return (
      <div className="space-y-3">
        <div>
          <Label>Search instructions</Label>
          <Textarea
            value={local.search}
            onChange={(e) =>
              setLocal((p) => ({ ...p, search: e.target.value }))
            }
            placeholder="Instructions that will be prepended to search queries."
            className="min-h-[90px] bg-white/5"
          />
        </div>

        <div>
          <Label>Chat instructions</Label>
          <Textarea
            value={local.chat}
            onChange={(e) => setLocal((p) => ({ ...p, chat: e.target.value }))}
            placeholder="Instructions that will be prepended to chat messages."
            className="min-h-[90px] bg-white/5"
          />
        </div>

        <div>
          <Label>Arsenal / Agent instructions</Label>
          <Textarea
            value={local.arsenal}
            onChange={(e) =>
              setLocal((p) => ({ ...p, arsenal: e.target.value }))
            }
            placeholder="Instructions applied to arsenal/agent flows."
            className="min-h-[90px] bg-white/5"
          />
        </div>
      </div>
    );
  };

  const SaveInstructionsButton: React.FC = () => {
    const { instructions, saveInstructions } = useArsenal();
    const [savingIns, setSavingIns] = React.useState(false);
    const [local, setLocal] = React.useState(instructions);
    React.useEffect(() => setLocal(instructions), [instructions]);

    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            // reset to stored
            setLocal(instructions);
          }}
        >
          Reset
        </Button>
        <Button
          onClick={async () => {
            setSavingIns(true);
            await saveInstructions(local);
            setSavingIns(false);
            toast({ title: "Instructions saved" });
          }}
          disabled={savingIns}
          className="bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition"
        >
          {savingIns ? "Saving..." : "Save Instructions"}
        </Button>
      </div>
    );
  };

  // per-item gradient palette for on-state (used by Arsenal toggles) (legacy UI still intact below)
  const toggleGradients: Record<string, string> = {
    "Deep Research": "linear-gradient(90deg,#7c3aed,#3b82f6)",
    "Smart Search": "linear-gradient(90deg,#06b6d4,#14b8a6)",
    "Agentic Search": "linear-gradient(90deg,#f472b6,#fb923c)",
    Gmail: "linear-gradient(90deg,#06b6d4,#06b6d4)",
    Reddit: "linear-gradient(90deg,#ff4500,#ff8c00)",
    "Twitter/X": "linear-gradient(90deg,#1da1f2,#0ea5e9)",
  };

  const [activityLog] = useState([
    {
      action: "Profile updated",
      date: new Date(2025, 4, 15),
      details: "Updated personal information",
    },
    {
      action: "Joined workspace",
      date: new Date(2025, 4, 10),
      details: 'Joined "Product Research" workspace',
    },
    {
      action: "Account created",
      date: new Date(2025, 3, 25),
      details: "Signed up for CognixAI",
    },
  ]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Calculate profile completion percentage
    calculateProfileCompletion();
  }, [profile]);

  // keep profile.theme in sync with ThemeContext
  useEffect(() => {
    setProfile((prev) => ({ ...prev, theme: currentTheme }));
  }, [currentTheme]);

  const calculateProfileCompletion = () => {
    // Define required fields to count towards completion
    const requiredFields = [
      !!profile.fullName,
      !!profile.jobTitle,
      !!profile.bio,
      !!profile.hobbies,
      !!profile.workLife,
      !!profile.location,
      !!profile.avatarUrl,
      !!profile.website,
      !!(profile.skills && profile.skills.length > 0),
      !!(
        profile.social &&
        (profile.social.twitter ||
          profile.social.linkedin ||
          profile.social.github)
      ),
    ];

    // Calculate percentage
    const filledFields = requiredFields.filter(Boolean).length;
    const percentage = Math.floor((filledFields / requiredFields.length) * 100);

    setCompletionPercentage(percentage);
  };

  const loadProfile = async () => {
    setIsLoading(true);

    // Try to load profile from localStorage first (for demo mode)
    const savedProfile = localStorage.getItem("cognix_user_profile");
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        // Fix for spread operator issues - ensure we have a valid object before spreading
        if (parsedProfile && typeof parsedProfile === "object") {
          // Create a new object with defaultProfile as base and override with valid parsedProfile values
          const safeProfile: ProfileData = {
            fullName: parsedProfile.fullName || defaultProfile.fullName,
            jobTitle: parsedProfile.jobTitle || defaultProfile.jobTitle,
            bio: parsedProfile.bio || defaultProfile.bio,
            hobbies: parsedProfile.hobbies || defaultProfile.hobbies,
            workLife: parsedProfile.workLife || defaultProfile.workLife,
            avatarUrl: parsedProfile.avatarUrl || defaultProfile.avatarUrl,
            location: parsedProfile.location || defaultProfile.location,
            website: parsedProfile.website || defaultProfile.website,
            social:
              parsedProfile.social && typeof parsedProfile.social === "object"
                ? parsedProfile.social
                : defaultProfile.social,
            skills: Array.isArray(parsedProfile.skills)
              ? parsedProfile.skills
              : defaultProfile.skills,
            interests: Array.isArray(parsedProfile.interests)
              ? parsedProfile.interests
              : defaultProfile.interests,
            notifications:
              parsedProfile.notifications &&
              typeof parsedProfile.notifications === "object"
                ? parsedProfile.notifications
                : defaultProfile.notifications,
            theme: parsedProfile.theme || defaultProfile.theme,
            language: parsedProfile.language || defaultProfile.language,
            timezone: parsedProfile.timezone || defaultProfile.timezone,
          };

          setProfile(safeProfile);
          if (parsedProfile.avatarUrl) {
            setPreviewUrl(parsedProfile.avatarUrl);
          }
        } else {
          // If parsedProfile is not an object, just use defaultProfile
          setProfile(defaultProfile);
        }
        setIsLoading(false);
        return;
      } catch (err) {
        console.error("Failed to parse profile data:", err);
      }
    }

    // If Firebase auth is available, try to load profile from Firestore first
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const profileRef = doc(db, "profiles", firebaseUser.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          const safeProfile: ProfileData = {
            fullName: data.fullName || defaultProfile.fullName,
            jobTitle: data.jobTitle || defaultProfile.jobTitle,
            bio: data.bio || defaultProfile.bio,
            hobbies: data.hobbies || defaultProfile.hobbies,
            workLife: data.workLife || defaultProfile.workLife,
            avatarUrl: data.avatarUrl || defaultProfile.avatarUrl,
            location: data.location || defaultProfile.location,
            website: data.website || defaultProfile.website,
            social:
              data.social && typeof data.social === "object"
                ? data.social
                : defaultProfile.social,
            skills: Array.isArray(data.skills)
              ? data.skills
              : defaultProfile.skills,
            interests: Array.isArray(data.interests)
              ? data.interests
              : defaultProfile.interests,
            notifications:
              data.notifications && typeof data.notifications === "object"
                ? data.notifications
                : defaultProfile.notifications,
            theme: data.theme || defaultProfile.theme,
            language: data.language || defaultProfile.language,
            timezone: data.timezone || defaultProfile.timezone,
          };
          setProfile(safeProfile);
          if (safeProfile.avatarUrl) setPreviewUrl(safeProfile.avatarUrl);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Firestore profile load failed:", e);
    }

    // If Supabase is configured, try to load profile from there
    if (isSupabaseConfigured() && supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (data && !error) {
            // Create a safe profile object with proper type checking
            const safeProfile: ProfileData = {
              fullName: data.full_name || defaultProfile.fullName,
              jobTitle: data.job_title || defaultProfile.jobTitle,
              bio: data.bio || defaultProfile.bio,
              hobbies: data.hobbies || defaultProfile.hobbies,
              workLife: data.work_life || defaultProfile.workLife,
              avatarUrl: data.avatar_url || defaultProfile.avatarUrl,
              location: data.location || defaultProfile.location,
              website: data.website || defaultProfile.website,
              social:
                data.social && typeof data.social === "object"
                  ? data.social
                  : defaultProfile.social,
              skills: Array.isArray(data.skills)
                ? data.skills
                : defaultProfile.skills,
              interests: Array.isArray(data.interests)
                ? data.interests
                : defaultProfile.interests,
              notifications:
                data.notifications && typeof data.notifications === "object"
                  ? data.notifications
                  : defaultProfile.notifications,
              theme: data.theme || defaultProfile.theme,
              language: data.language || defaultProfile.language,
              timezone: data.timezone || defaultProfile.timezone,
            };

            setProfile(safeProfile);

            if (data.avatar_url) {
              setPreviewUrl(data.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Failed to load profile",
          description: "We couldn't load your profile information",
          variant: "destructive",
        });
      }
    }

    setIsLoading(false);
  };

  const themes = [
    {
      name: "System",
      icon: <Laptop size={16} />,
      value: "system",
      border: "border-white/10",
    },
    {
      name: "Dark",
      icon: <Moon size={16} />,
      value: "dark",
      border: "border-purple-500/60",
    },
    {
      name: "Light",
      icon: <Sun size={16} />,
      value: "light",
      border: "border-orange-400/70",
    },
  ];

  const handleThemeChange = (mode: "light" | "dark" | "system") => {
    setThemeContext(mode);
    setProfile((prev) => ({ ...prev, theme: mode }));
  };

  function toggleAddon(name: string) {
    setSelectedAddons((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Generate preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parentKey, childKey] = name.split(".");
      setProfile((prev) => {
        // Create a safe copy of the nested object to modify
        const parentObject = prev[parentKey as keyof ProfileData];
        if (parentObject && typeof parentObject === "object") {
          return {
            ...prev,
            [parentKey]: {
              ...(parentObject as object),
              [childKey]: value,
            },
          };
        }
        return prev;
      });
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name.includes(".")) {
      const [parentKey, childKey] = name.split(".");
      setProfile((prev) => {
        // Create a safe copy of the nested object to modify
        const parentObject = prev[parentKey as keyof ProfileData];
        if (parentObject && typeof parentObject === "object") {
          return {
            ...prev,
            [parentKey]: {
              ...(parentObject as object),
              [childKey]: checked,
            },
          };
        }
        return prev;
      });
    } else {
      setProfile((prev) => ({ ...prev, [name]: checked }));
    }
  };

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    if (!profile.skills?.includes(newSkill.trim())) {
      setProfile((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()],
      }));
    }

    setNewSkill("");
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills?.filter((skill) => skill !== skillToRemove) || [],
    }));
  };

  const saveProfile = async () => {
    setSaving(true);

    try {
      // Always save to localStorage for demo mode
      localStorage.setItem(
        "cognix_user_profile",
        JSON.stringify({
          ...profile,
          avatarUrl: previewUrl,
        })
      );

      // If Firebase auth is available, persist profile to Firestore
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const profileRef = doc(db, "profiles", firebaseUser.uid);
          await setDoc(
            profileRef,
            {
              fullName: profile.fullName,
              jobTitle: profile.jobTitle,
              bio: profile.bio,
              hobbies: profile.hobbies,
              workLife: profile.workLife,
              avatarUrl: previewUrl || profile.avatarUrl,
              location: profile.location,
              website: profile.website,
              social: profile.social,
              skills: profile.skills,
              interests: profile.interests,
              notifications: profile.notifications,
              theme: profile.theme,
              language: profile.language,
              timezone: profile.timezone,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn("Failed to save profile to Firestore:", e);
      }

      // If Supabase is configured, save there too
      if (isSupabaseConfigured() && supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Upload avatar if there is a new one
        let avatarUrl = profile.avatarUrl;
        if (avatarFile) {
          const fileExt = avatarFile.name.split(".").pop();
          const filePath = `avatars/${user.id}/${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("profiles")
            .upload(filePath, avatarFile);

          if (uploadError) {
            throw uploadError;
          }

          // Get the public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("profiles").getPublicUrl(filePath);

          avatarUrl = publicUrl;
        }

        // Update the profile record
        const { error } = await supabase.from("profiles").upsert({
          user_id: user.id,
          full_name: profile.fullName,
          job_title: profile.jobTitle,
          bio: profile.bio,
          hobbies: profile.hobbies,
          work_life: profile.workLife,
          avatar_url: avatarUrl,
          location: profile.location,
          website: profile.website,
          social: profile.social,
          skills: profile.skills,
          interests: profile.interests,
          notifications: profile.notifications,
          theme: profile.theme,
          language: profile.language,
          timezone: profile.timezone,
          updated_at: new Date(),
        });

        if (error) {
          throw error;
        }
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });

      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Failed to update profile",
        description: "An error occurred while saving your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (profile.fullName) {
      return profile.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return "U";
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const exportProfile = () => {
    try {
      const dataStr = JSON.stringify(profile, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `cognix-profile-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      toast({
        title: "Profile exported",
        description: "Your profile has been successfully exported",
      });
    } catch (error) {
      console.error("Error exporting profile:", error);
      toast({
        title: "Export failed",
        description: "Failed to export your profile",
        variant: "destructive",
      });
    }
  };

  const importProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProfile = JSON.parse(event.target?.result as string);

        if (importedProfile && typeof importedProfile === "object") {
          // Ensure the imported profile has valid structure
          const safeProfile = {
            ...defaultProfile,
            fullName: importedProfile.fullName || defaultProfile.fullName,
            jobTitle: importedProfile.jobTitle || defaultProfile.jobTitle,
            bio: importedProfile.bio || defaultProfile.bio,
            hobbies: importedProfile.hobbies || defaultProfile.hobbies,
            workLife: importedProfile.workLife || defaultProfile.workLife,
            location: importedProfile.location || defaultProfile.location,
            website: importedProfile.website || defaultProfile.website,
            social:
              importedProfile.social &&
              typeof importedProfile.social === "object"
                ? importedProfile.social
                : defaultProfile.social,
            skills: Array.isArray(importedProfile.skills)
              ? importedProfile.skills
              : defaultProfile.skills,
            interests: Array.isArray(importedProfile.interests)
              ? importedProfile.interests
              : defaultProfile.interests,
            notifications:
              importedProfile.notifications &&
              typeof importedProfile.notifications === "object"
                ? importedProfile.notifications
                : defaultProfile.notifications,
            theme: importedProfile.theme || defaultProfile.theme,
            language: importedProfile.language || defaultProfile.language,
            timezone: importedProfile.timezone || defaultProfile.timezone,
          };

          setProfile(safeProfile);
          toast({
            title: "Profile imported",
            description: "Your profile has been successfully imported",
          });
        }
      } catch (error) {
        console.error("Error parsing imported profile:", error);
        toast({
          title: "Import failed",
          description: "The selected file is not a valid profile",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse flex space-x-2 mb-4 justify-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          </div>
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="flex justify-center mb-0">
                <img
                  src="/favicon.png"
                  alt="Nelieo Logo"
                  style={{ height: 45 }}
                />
              </div>
              <span className="font-bold text-xl hidden sm:inline-block">
                Nelieo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/search")}
            >
              Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/workspace")}
            >
              Workspace
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-purple-500/20 hover:bg-purple-500/30"
            >
              <User size={18} />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8">
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/search"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to search</span>
          </Link>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:w-1/3"
          >
            <Card
              className={`border-border/40 ${cardBg} backdrop-blur-lg sticky top-24`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4 group">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      }}
                    >
                      <Avatar className="w-24 h-24 border-4 border-background">
                        {previewUrl ? (
                          <AvatarImage src={previewUrl} alt="Profile" />
                        ) : (
                          <AvatarFallback className="bg-purple-800/20 text-xl">
                            {getInitials()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <label
                        htmlFor="avatar-upload"
                        className={`absolute inset-0 flex items-center justify-center ${overlayBg} rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity`}
                      >
                        <Camera className={iconClass} size={24} />
                        <span className="sr-only">Upload avatar</span>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="sr-only"
                      />
                    </motion.div>
                  </div>

                  <h2 className="text-xl font-bold mb-1">
                    {profile.fullName || "Your Name"}
                  </h2>
                  <p className="text-gray-400 mb-2">
                    {profile.jobTitle || "Your Title"}
                  </p>

                  {/* Profile Completion */}
                  <div className="w-full mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Profile Completion</span>
                      <span
                        className={
                          completionPercentage === 100
                            ? "text-green-500"
                            : "text-gray-400"
                        }
                      >
                        {completionPercentage}%
                      </span>
                    </div>
                    <Progress
                      value={completionPercentage}
                      className={`h-1.5 ${
                        completionPercentage < 50
                          ? "bg-red-950"
                          : completionPercentage < 80
                          ? "bg-yellow-950"
                          : "bg-green-950"
                      }`}
                      indicatorClassName={`${
                        completionPercentage < 50
                          ? "bg-red-500"
                          : completionPercentage < 80
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {profile.skills &&
                      profile.skills.slice(0, 3).map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-purple-500/20"
                        >
                          {skill}
                        </Badge>
                      ))}
                    {profile.skills && profile.skills.length > 3 && (
                      <Badge variant="outline">
                        +{profile.skills.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportProfile}
                      className="text-xs bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition"
                    >
                      Export
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition"
                        onClick={() =>
                          document.getElementById("import-profile")?.click()
                        }
                      >
                        Import
                      </Button>
                      <input
                        id="import-profile"
                        type="file"
                        accept=".json"
                        onChange={importProfile}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    className={clsx(
                      "w-full py-2 px-4 rounded-md flex items-center gap-2 transition-colors",
                      activeTab === "personal"
                        ? "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-muted"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => setActiveTab("personal")}
                  >
                    <User size={16} />
                    <span>Personal Info</span>
                  </button>

                  <button
                    className={clsx(
                      "w-full py-2 px-4 rounded-md flex items-center gap-2 transition-colors",
                      activeTab === "security"
                        ? "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-muted"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => setActiveTab("security")}
                  >
                    <Shield size={16} />
                    <span>Security</span>
                  </button>

                  <button
                    className={clsx(
                      "w-full py-2 px-4 rounded-md flex items-center gap-2 transition-colors",
                      activeTab === "preferences"
                        ? "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-muted"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => setActiveTab("preferences")}
                  >
                    <UserCog size={16} />
                    <span>Preferences</span>
                  </button>

                  <button
                    className={clsx(
                      "w-full py-2 px-4 rounded-md flex items-center gap-2 transition-colors",
                      activeTab === "arsenal"
                        ? "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-muted"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => setActiveTab("arsenal")}
                  >
                    <LayoutDashboard size={16} />
                    <span>Arsenal</span>
                  </button>

                  <button
                    className={clsx(
                      "w-full py-2 px-4 rounded-md flex items-center gap-2 transition-colors",
                      activeTab === "activity"
                        ? "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white"
                        : isLight
                        ? "text-gray-700 hover:bg-muted"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                    onClick={() => setActiveTab("activity")}
                  >
                    <Clock size={16} />
                    <span>Activity Log</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:w-2/3"
          >
            <AnimatePresence mode="wait">
              {activeTab === "personal" && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg mb-6`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <PenSquare size={18} />
                        <span>Personal Information</span>
                      </CardTitle>
                      <CardDescription>
                        Update your personal details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            name="fullName"
                            value={profile.fullName}
                            onChange={handleInputChange}
                            placeholder="Enter your full name"
                            className="bg-white/5"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input
                            id="jobTitle"
                            name="jobTitle"
                            value={profile.jobTitle}
                            onChange={handleInputChange}
                            placeholder="What do you do?"
                            className="bg-white/5"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={profile.bio}
                          onChange={handleInputChange}
                          placeholder="Tell us a bit about yourself"
                          className="bg-white/5 min-h-[100px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            value={profile.location}
                            onChange={handleInputChange}
                            placeholder="City, Country"
                            className="bg-white/5"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            name="website"
                            value={profile.website}
                            onChange={handleInputChange}
                            placeholder="https://your-website.com"
                            className="bg-white/5"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skills">Skills</Label>
                        <form onSubmit={addSkill} className="flex gap-2">
                          <Input
                            id="newSkill"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Add a skill"
                            className="bg-white/5"
                          />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            className="bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition"
                          >
                            Add
                          </Button>
                        </form>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {profile.skills?.map((skill, index) => (
                            <Badge
                              key={index}
                              className="pl-2 pr-1 py-1 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              {skill}
                              <button
                                onClick={() => removeSkill(skill)}
                                className="ml-1 rounded-full hover:bg-white/20 w-5 h-5 inline-flex items-center justify-center"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hobbies">Hobbies & Interests</Label>
                        <Textarea
                          id="hobbies"
                          name="hobbies"
                          value={profile.hobbies}
                          onChange={handleInputChange}
                          placeholder="What do you enjoy doing in your free time?"
                          className="bg-white/5 min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="workLife">Work Life</Label>
                        <Textarea
                          id="workLife"
                          name="workLife"
                          value={profile.workLife}
                          onChange={handleInputChange}
                          placeholder="Tell us about your work experience and career"
                          className="bg-white/5 min-h-[80px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg mb-6`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Link2 size={18} />
                        <span>Social Profiles</span>
                      </CardTitle>
                      <CardDescription>
                        Connect your social media accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <Input
                          id="twitter"
                          name="social.twitter"
                          value={profile.social?.twitter || ""}
                          onChange={handleInputChange}
                          placeholder="@username"
                          className="bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          name="social.linkedin"
                          value={profile.social?.linkedin || ""}
                          onChange={handleInputChange}
                          placeholder="linkedin.com/in/username"
                          className="bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="github">GitHub</Label>
                        <Input
                          id="github"
                          name="social.github"
                          value={profile.social?.github || ""}
                          onChange={handleInputChange}
                          placeholder="github.com/username"
                          className="bg-white/5"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg mb-6`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Key size={18} />
                        <span>Password & Security</span>
                      </CardTitle>
                      <CardDescription>
                        Manage your account security
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Current Password
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Enter your current password"
                          className="bg-white/5"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="Enter new password"
                            className="bg-white/5"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">
                            Confirm Password
                          </Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            className="bg-white/5"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="secondary"
                          className="bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10 transition"
                        >
                          Update Password
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Shield size={18} />
                        <span>Account Protection</span>
                      </CardTitle>
                      <CardDescription>
                        Manage additional security settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium mb-1">
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium mb-1">
                            Device Management
                          </h3>
                          <p className="text-sm text-gray-400">
                            Manage devices that are signed in to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium mb-1">Login History</h3>
                          <p className="text-sm text-gray-400">
                            View recent login attempts to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg mb-6`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Bell size={18} />
                        <span>Notifications</span>
                      </CardTitle>
                      <CardDescription>
                        Control how and when you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-start gap-3">
                          <BellRing className="mt-0.5" size={18} />
                          <div>
                            <h3 className="font-medium">Email Notifications</h3>
                            <p className="text-sm text-gray-400">
                              Receive notifications via email
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={profile.notifications?.email || false}
                          onCheckedChange={(checked) =>
                            handleSwitchChange("notifications.email", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-start gap-3">
                          <Globe className="mt-0.5" size={18} />
                          <div>
                            <h3 className="font-medium">
                              In-App Notifications
                            </h3>
                            <p className="text-sm text-gray-400">
                              Show notifications in the app
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={profile.notifications?.app || false}
                          onCheckedChange={(checked) =>
                            handleSwitchChange("notifications.app", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-start gap-3">
                          <BookOpen className="mt-0.5" size={18} />
                          <div>
                            <h3 className="font-medium">Marketing Updates</h3>
                            <p className="text-sm text-gray-400">
                              Receive newsletters and product updates
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={profile.notifications?.marketing || false}
                          onCheckedChange={(checked) =>
                            handleSwitchChange(
                              "notifications.marketing",
                              checked
                            )
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <LayoutDashboard size={18} />
                        <span>Display & Language</span>
                      </CardTitle>
                      <CardDescription>
                        Customize your app experience
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <div className="flex gap-4">
                          {themes.map((t) => (
                            <button
                              key={t.value}
                              onClick={() =>
                                handleThemeChange(
                                  t.value as "light" | "dark" | "system"
                                )
                              }
                              className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                                currentTheme === t.value
                                  ? "bg-primary text-primary-foreground border-transparent"
                                  : `bg-white/6 backdrop-blur-sm border-2 ${t.border} text-purple-700 dark:text-white hover:bg-white/10`
                              )}
                            >
                              {t.icon}
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <div className="flex items-center">
                            <Languages size={18} className="text-gray-400" />
                          </div>
                          <div className="flex-1">
                            {/* Simple searchable language selector */}
                            <input
                              id="language_search"
                              placeholder="Search or pick a language"
                              className="w-full bg-white/5 rounded-md border border-white/10 px-3 py-2 mb-2"
                              onChange={(e) =>
                                setLanguageFilter(e.target.value)
                              }
                            />
                            <div className="max-h-40 overflow-auto rounded-md border border-white/10 bg-background">
                              {filteredLanguages.length === 0 ? (
                                <div className="p-2 text-sm text-gray-400">
                                  No languages found
                                </div>
                              ) : (
                                filteredLanguages.map((lang) => (
                                  <button
                                    key={lang.code}
                                    onClick={() =>
                                      setProfile((prev) => ({
                                        ...prev,
                                        language: lang.name,
                                      }))
                                    }
                                    className={clsx(
                                      "w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2",
                                      profile.language === lang.name
                                        ? "bg-primary/10 font-medium"
                                        : ""
                                    )}
                                  >
                                    <span className="text-sm">{lang.name}</span>
                                    <span className="ml-auto text-xs text-gray-400">
                                      {lang.native}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <div className="flex items-center">
                            <Globe size={18} className="text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <input
                              id="timezone_search"
                              placeholder="Search timezone (e.g. PST, London, UTC+1)"
                              className="w-full bg-white/5 rounded-md border border-white/10 px-3 py-2 mb-2"
                              onChange={(e) =>
                                setTimezoneFilter(e.target.value)
                              }
                            />
                            <div className="max-h-44 overflow-auto rounded-md border border-white/10 bg-background">
                              {filteredTimezones.length === 0 ? (
                                <div className="p-2 text-sm text-gray-400">
                                  No timezones found
                                </div>
                              ) : (
                                filteredTimezones.map((tz) => (
                                  <button
                                    key={tz.value}
                                    onClick={() =>
                                      setProfile((prev) => ({
                                        ...prev,
                                        timezone: tz.value,
                                      }))
                                    }
                                    className={clsx(
                                      "w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2",
                                      profile.timezone === tz.value
                                        ? "bg-primary/10 font-medium"
                                        : ""
                                    )}
                                  >
                                    <span className="text-sm">{tz.label}</span>
                                    <span className="ml-auto text-xs text-gray-400">
                                      {tz.offset}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "arsenal" && (
                <motion.div
                  key="arsenal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4">
                    <ArsenalPanel />

                    {/* AI Instructions panel */}
                    <Card
                      className={`border-border/40 ${cardBg} backdrop-blur-lg`}
                    >
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <PenSquare size={18} />
                          <span>AI Instructions</span>
                        </CardTitle>
                        <CardDescription>
                          Persist default instructions the assistant should
                          follow for different contexts.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InstructionsEditor />
                      </CardContent>
                      <CardFooter>
                        <div className="flex justify-end w-full">
                          <SaveInstructionsButton />
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "activity" && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border-border/40 ${cardBg} backdrop-blur-lg`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Clock size={18} />
                        <span>Activity Log</span>
                      </CardTitle>
                      <CardDescription>
                        Your recent activity within the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {activityLog.map((activity, index) => (
                          <motion.div
                            key={index}
                            className="flex gap-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Award size={16} />
                              </div>
                              {index < activityLog.length - 1 && (
                                <div className="absolute top-10 bottom-0 left-1/2 w-0.5 -ml-px bg-white/10"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">
                                    {activity.action}
                                  </h3>
                                  <p className="text-sm text-gray-400">
                                    {activity.details}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {formatDate(activity.date)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="flex justify-end mt-6"
              animate={{
                scale: saving ? 0.98 : savedRecently ? 1.03 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={saveProfile}
                disabled={saving || savedRecently}
                className={`relative overflow-hidden ${
                  savedRecently
                    ? "bg-green-600"
                    : "bg-white/6 backdrop-blur-sm border-2 border-purple-500/60 text-purple-700 dark:text-white hover:bg-white/10"
                }`}
              >
                {savedRecently ? (
                  <>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                      }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      Saved!
                    </motion.span>
                    <span className="opacity-0">Save Profile</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Profile"}
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
