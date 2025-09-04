import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowLeft,
  ArrowRight,
  History,
  User,
  Settings,
  Trash2,
  Search,
  MessageCircle,
  Brain,
  Library,
  Users,
  Edit,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  where, // <-- add where import
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase"; // Import Firestore and Auth
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface SearchHistoryItem {
  id: string; // Add the id property
  query: string;
  mode: "search" | "chat" | "agentic";
  timestamp: number;
  model?: "gpt-3.5" | "gpt-4.1" | "gpt-4o";
}

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchHistory: SearchHistoryItem[];
  onHistoryItemClick: (
    query: string,
    mode: "search" | "chat" | "agentic",
    model?: any
  ) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const SearchSidebar = ({
  isOpen,
  onClose,
  searchHistory,
  onHistoryItemClick,
  isVisible,
  onToggleVisibility,
}: SearchSidebarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState<"history" | "workspace">(
    "history"
  );
  const [firebaseSearchHistory, setFirebaseSearchHistory] = useState<
    SearchHistoryItem[]
  >([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Track the index of the item being renamed

  // Fetch search history realtime from Firebase (filtered by user)
  const subscribeSearchHistory = () => {
    const user = auth.currentUser;
    if (!user) return () => {};
    const qRef = collection(db, "users", user.uid, "searchHistory");
    const unsub = onSnapshot(qRef, (snapshot) => {
      const history = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          query: data.query,
          mode: data.mode,
          timestamp: data.timestamp,
          model: data.model,
        } as SearchHistoryItem;
      });
      setFirebaseSearchHistory(
        history.sort((a, b) => b.timestamp - a.timestamp)
      );
    });
    return unsub;
  };

  // Save a new search to Firebase
  const saveSearchToFirebase = async (queryStr: string, mode: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, "users", user.uid, "searchHistory"), {
        query: queryStr,
        mode,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("❌ Failed to save search:", error);
    }
  };

  // Function to rename a search history item
  const renameSearchHistoryItem = async (index: number, newQuery: string) => {
    const item = firebaseSearchHistory[index];
    if (!item || item.query === newQuery.trim()) return;

    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, "users", user.uid, "searchHistory", item.id);
      await updateDoc(docRef, { query: newQuery.trim() });
      setEditingIndex(null); // Exit editing mode
    } catch (error) {
      console.error("❌ Failed to rename search history item:", error);
    }
  };

  // Function to delete a search history item
  const deleteSearchHistoryItem = async (index: number) => {
    const item = firebaseSearchHistory[index];
    if (!item) return;

    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, "users", user.uid, "searchHistory", item.id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("❌ Failed to delete search history item:", error);
    }
  };

  // Fetch search history on component mount
  React.useEffect(() => {
    const unsub = subscribeSearchHistory();
    return () => unsub && unsub();
  }, []);

  // Helper function to format the timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to get mode icon
  const getModeIcon = (mode: "search" | "chat" | "agentic") => {
    switch (mode) {
      case "search":
        return <Search size={14} />;
      case "chat":
        return <MessageCircle size={14} />;
      case "agentic":
        return <Brain size={14} />;
      default:
        return <Search size={14} />;
    }
  };

  // Function to get model badge color
  const getModelBadgeColor = (model?: string) => {
    switch (model) {
      case "gpt-4.1":
        return "bg-blue-500/30";
      case "gpt-4o":
        return "bg-purple-500/30";
      default:
        return "bg-gray-500/30";
    }
  };

  // Sidebar toggle logic
  const handleToggleVisibility = () => {
    if (isMobile && isOpen) {
      onClose();
      return;
    }
    onToggleVisibility();
  };

  // BrandedTooltip: small, animated, rounded, dark-mode ready
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

  if (isMobile) {
    return (
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed inset-y-0 left-0 w-full xs:w-80 bg-black/95 backdrop-blur-md z-50 flex flex-col border-r border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.5)]`}
      >
        <div className="h-16 border-b border-white/10 px-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="font-bold text-white">C</span>
            </div>
            <span className="font-bold text-xl">History</span>
          </motion.div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="text-white hover:text-red-400 transition p-2 rounded-full"
            type="button"
          >
            <ArrowLeft size={18} />
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <motion.button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              selectedTab === "history"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setSelectedTab("history")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} />
              <span>History</span>
            </div>
          </motion.button>
          <motion.button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              selectedTab === "workspace"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setSelectedTab("workspace")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={16} />
              <span>Workspace</span>
            </div>
          </motion.button>
        </div>

        <ScrollArea className="flex-1">
          {selectedTab === "history" ? (
            firebaseSearchHistory.length > 0 ? (
              <div className="py-2 px-2">
                {firebaseSearchHistory.map((item, index) => (
                  <motion.div
                    key={`${item.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="w-full text-left p-3 rounded-lg bg-gradient-to-br from-purple-800/30 to-gray-800/30 hover:bg-purple-700/30 transition-all shadow-md mb-2"
                  >
                    {editingIndex === index ? (
                      <input
                        type="text"
                        defaultValue={item.query}
                        onBlur={(e) =>
                          renameSearchHistoryItem(index, e.target.value)
                        }
                        className="w-full text-sm bg-transparent border-b border-purple-500 focus:outline-none text-white"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() =>
                          onHistoryItemClick(item.query, item.mode)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-white/10 rounded-full p-1">
                            {getModeIcon(item.mode)}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {formatTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm truncate text-white">
                          {item.query}
                        </p>
                      </button>
                    )}
                    <div className="flex gap-2 mt-2">
                      {/* Rename Button */}
                      <BrandedTooltip content="Rename">
                        <button
                          onClick={() => setEditingIndex(index)}
                          className="p-1.5 rounded bg-purple-600/30 backdrop-blur-md hover:bg-purple-700/50 text-white transition flex items-center justify-center"
                        >
                          <Edit size={16} />
                        </button>
                      </BrandedTooltip>
                      {/* Delete Button */}
                      <BrandedTooltip content="Delete">
                        <button
                          onClick={() => deleteSearchHistoryItem(index)}
                          className="p-1.5 rounded bg-red-600/30 backdrop-blur-md hover:bg-red-700/50 text-white transition flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </BrandedTooltip>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="p-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <History className="text-gray-400" size={20} />
                </div>
                <h3 className="text-sm font-medium mb-1">No search history</h3>
                <p className="text-xs text-gray-400">
                  Your recent searches will appear here
                </p>
              </motion.div>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-4 space-y-4"
            >
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <Users className="text-purple-400" size={20} />
                </div>
                <h3 className="text-sm font-medium mb-1">Team Workspace</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Collaborate with your team and share research
                </p>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-500"
                    onClick={() => navigate("/workspace")}
                  >
                    Go to Workspace
                  </Button>
                </motion.div>
              </div>

              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <h4 className="font-medium text-sm mb-2 text-purple-200">
                  Workspace Features
                </h4>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Users size={12} className="text-purple-300" />
                    </div>
                    <span>Collaborate with team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Library size={12} className="text-purple-300" />
                    </div>
                    <span>Create shared knowledge bases</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain size={12} className="text-purple-300" />
                    </div>
                    <span>AI-powered team documents</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-white/10">
          <div className="flex justify-between">
            <BrandedTooltip content="Profile">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate("/profile")}
              >
                <User size={16} />
                <span>Profile</span>
              </Button>
            </BrandedTooltip>
            <BrandedTooltip content="Settings">
              <Button
                onClick={() => navigate("/profile")}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                <span>Settings</span>
              </Button>
            </BrandedTooltip>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Toggle button for desktop */}
      <motion.button
        className="hidden md:flex fixed left-0 top-24 bg-background/20 backdrop-blur-md hover:bg-background/30 z-30 p-1.5 rounded-r-lg border border-l-0 border-border"
        onClick={handleToggleVisibility}
        animate={{
          left: isVisible ? "267px" : "0px",
          rotate: isVisible ? 180 : 0,
        }}
        transition={{ duration: 0.15 }}
      >
        <ArrowLeft size={16} />
      </motion.button>

      {/* Sidebar for desktop */}
      <motion.div
        className="hidden md:flex flex-col fixed left-0 top-16 bottom-0 w-[270px] bg-background/10 backdrop-blur-xl border-r border-border z-20"
        animate={{
          x: isVisible ? 0 : -280,
        }}
        transition={{ duration: 0.15 }}
      >
        {/* Tabs */}
        <div className="flex border-b border-border/60 bg-transparent">
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              selectedTab === "history"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setSelectedTab("history")}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} />
              <span>History</span>
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              selectedTab === "workspace"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setSelectedTab("workspace")}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={16} />
              <span>Workspace</span>
            </div>
          </button>
        </div>

        <ScrollArea className="flex-1">
          <AnimatePresence mode="wait">
            {selectedTab === "history" ? (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {firebaseSearchHistory.length > 0 ? (
                  <div className="py-2 px-2">
                    {firebaseSearchHistory.map((item, index) => (
                      <motion.div
                        key={`${item.timestamp}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="w-full text-left p-3 rounded-lg bg-gradient-to-br from-purple-800/30 to-gray-800/30 hover:bg-purple-700/30 transition-all shadow-md mb-2"
                      >
                        {editingIndex === index ? (
                          <input
                            type="text"
                            defaultValue={item.query}
                            onBlur={(e) =>
                              renameSearchHistoryItem(index, e.target.value)
                            }
                            className="w-full text-sm bg-transparent border-b border-purple-500 focus:outline-none text-white"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() =>
                              onHistoryItemClick(item.query, item.mode)
                            }
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-muted/60 rounded-full p-1">
                                {getModeIcon(item.mode)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatTime(item.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm truncate text-foreground">
                              {item.query}
                            </p>
                          </button>
                        )}
                        <div className="flex gap-2 mt-2">
                          {/* Rename Button */}
                          <BrandedTooltip content="Rename">
                            <button
                              onClick={() => setEditingIndex(index)}
                              className="p-1.5 rounded bg-purple-600/30 backdrop-blur-md hover:bg-purple-700/50 text-white transition flex items-center justify-center"
                            >
                              <Edit size={16} />
                            </button>
                          </BrandedTooltip>
                          {/* Delete Button */}
                          <BrandedTooltip content="Delete">
                            <button
                              onClick={() => deleteSearchHistoryItem(index)}
                              className="p-1.5 rounded bg-red-600/30 backdrop-blur-md hover:bg-red-700/50 text-white transition flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          </BrandedTooltip>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <History className="text-gray-400" size={20} />
                    </div>
                    <h3 className="text-sm font-medium mb-1">
                      No search history
                    </h3>
                    <p className="text-xs text-gray-400">
                      Your recent searches will appear here
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 space-y-4"
              >
                <div className="p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                    <Users className="text-purple-400" size={20} />
                  </div>
                  <h3 className="text-sm font-medium mb-1">Team Workspace</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Collaborate with your team and share research
                  </p>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-500"
                      onClick={() => navigate("/workspace")}
                    >
                      Go to Workspace
                    </Button>
                  </motion.div>
                </div>

                <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                  <h4 className="font-medium text-sm mb-2 text-purple-200">
                    Workspace Features
                  </h4>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Users size={12} className="text-purple-300" />
                      </div>
                      <span>Collaborate with team members</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Library size={12} className="text-purple-300" />
                      </div>
                      <span>Create shared knowledge bases</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Brain size={12} className="text-purple-300" />
                      </div>
                      <span>AI-powered team documents</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        <div className="p-4 border-t border-border/60 bg-transparent">
          <div className="flex justify-between">
            <BrandedTooltip content="Profile">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate("/profile")}
              >
                <User size={16} />
                <span>Profile</span>
              </Button>
            </BrandedTooltip>
            <BrandedTooltip content="Settings">
              <Button
                onClick={() => navigate("/profile")}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                <span>Settings</span>
              </Button>
            </BrandedTooltip>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default SearchSidebar;
