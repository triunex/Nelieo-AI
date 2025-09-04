"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquarePlus, Edit, Trash } from "lucide-react"; // Import icons
import { doc, updateDoc, deleteDoc } from "firebase/firestore"; // Import Firestore methods
import { db } from "@/lib/firebase"; // Import Firestore instance

const ChatSidebar = ({
  chats,
  onSelect,
  isOpen,
  onClose,
  onStartNewChat,
}: any) => {
  const [editingChatIndex, setEditingChatIndex] = useState<number | null>(null); // Track the chat being renamed
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(
    null
  ); // Track the chat being deleted

  const renameChat = async (chat: any, newName: string) => {
    try {
      const chatDoc = doc(db, "chats", chat.id); // Reference the chat document
      await updateDoc(chatDoc, { question: newName }); // Update the chat name in Firestore
      chat.question = newName; // Update the chat name locally
      console.log(`Chat renamed to: ${newName}`); // Debug log
    } catch (error) {
      console.error("❌ Failed to rename chat:", error);
    }
  };

  const deleteChat = async (chatId: string, index: number) => {
    try {
      const chatDoc = doc(db, "chats", chatId); // Reference the chat document
      await deleteDoc(chatDoc); // Delete the chat from Firestore
      chats.splice(index, 1); // Remove the chat locally
      console.log(`Chat deleted: ${chatId}`); // Debug log
    } catch (error) {
      console.error("❌ Failed to delete chat:", error);
    }
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }} // Start off-screen and transparent
      animate={{ x: isOpen ? 0 : -300, opacity: isOpen ? 1 : 0 }} // Slide in and fade in
      transition={{ duration: 0.5, ease: "easeOut" }} // Smooth transition
      className="fixed top-0 left-0 h-full w-72 bg-background/10 backdrop-blur-xl border-r border-border z-40 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-purple-700/20">
        <h2 className="text-lg font-semibold text-white">🕓 History</h2>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="text-white hover:text-red-400 transition"
        >
          ✖
        </motion.button>
      </div>

      {/* Start New Chat */}
      <div className="sticky top-0 z-10 bg-background/20 backdrop-blur-xl px-4 py-3 border-b border-border/60">
        <motion.button
          onClick={onStartNewChat}
          whileHover={{
            scale: 1.1,
            boxShadow: "0 0 20px rgba(168, 85, 247, 0.7)",
            backgroundColor: "rgba(128, 90, 213, 0.9)",
          }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 text-white bg-gradient-to-r from-purple-600/30 to-purple-500/30 backdrop-blur-lg border border-white/20 hover:from-purple-700 hover:to-purple-600 transition-all px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
        >
          <MessageSquarePlus className="w-5 h-5" />
          Start New Chat
        </motion.button>
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto h-[calc(100%-140px)] px-4 py-2 space-y-3 custom-scrollbar">
        {chats.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-400"
          >
            No past chats found.
          </motion.p>
        )}
        {chats.map((chat: any, i: number) => (
          <motion.div
            key={chat.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="w-full p-3 rounded-lg bg-card/70 hover:bg-card text-foreground transition flex flex-col gap-2 border border-border/60"
          >
            {/* Inline Rename */}
            {editingChatIndex === i ? (
              <input
                type="text"
                defaultValue={chat.question}
                onBlur={(e) => {
                  const newName = e.target.value.trim();
                  if (newName && newName !== chat.question) {
                    renameChat(chat, newName); // Persist the rename
                  }
                  setEditingChatIndex(null); // Exit editing mode
                }}
                className="w-full text-left text-sm bg-transparent border-b border-purple-500 focus:outline-none text-white"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelect(chat)}
                className="text-left text-sm truncate"
              >
                {chat.question}
              </button>
            )}
            <p className="text-xs text-gray-400">
              {new Date(chat.createdAt?.seconds * 1000).toLocaleString()}
            </p>
            <div className="flex gap-2">
              {/* Rename Button */}
              <button
                onClick={() => setEditingChatIndex(i)} // Enter editing mode
                className="p-1.5 rounded bg-gradient-to-br from-purple-600/30 to-purple-500/30 backdrop-blur-lg border border-white/20 hover:from-purple-700 hover:to-purple-600 text-white transition flex items-center justify-center shadow-lg"
                title="Rename Chat"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              {/* Delete Button */}
              <button
                onClick={() => setDeleteConfirmation(i)} // Show delete confirmation popup
                className="p-1.5 rounded bg-gradient-to-br from-red-600/30 to-red-500/30 backdrop-blur-lg border border-white/20 hover:from-red-700 hover:to-red-600 text-white transition flex items-center justify-center shadow-lg"
                title="Delete Chat"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Popup */}
      {deleteConfirmation !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-gray-800 border border-purple-500 rounded-lg p-6 text-white shadow-lg max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold mb-4">Delete Chat</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)} // Cancel deletion
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const chatId = chats[deleteConfirmation].id;
                  deleteChat(chatId, deleteConfirmation); // Persist the deletion
                  setDeleteConfirmation(null); // Close the popup
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        .custom-scrollbar, .chat-scroll-smooth {
          scrollbar-width: thin;
          scrollbar-color: #464646ff transparent;
        }

        .custom-scrollbar::-webkit-scrollbar,
        .chat-scroll-smooth::-webkit-scrollbar {
          width: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-track,
        .chat-scroll-smooth::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb,
        .chat-scroll-smooth::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7dd3fc 0%, #8b5cf6 100%);
          border-radius: 999px;
          border: 2px solid rgba(0,0,0,0.0);
          box-shadow: 0 2px 8px rgba(139,92,246,0.18) inset;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover,
        .chat-scroll-smooth::-webkit-scrollbar-thumb:hover {
          transform: scale(1.02);
          background: linear-gradient(180deg, #60a5fa 0%, #7c3aed 100%);
        }
      `}</style>
    </motion.div>
  );
};

export default ChatSidebar;
