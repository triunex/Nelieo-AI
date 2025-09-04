import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const ComingSoon = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="p-8 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 backdrop-blur-lg shadow-lg border border-white/20 max-w-lg text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center mb-6"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 backdrop-blur-md flex items-center justify-center shadow-md border border-white/20">
            <Sparkles size={32} className="text-white/80" />
          </div>
        </motion.div>
        <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">
          Coming Soon
        </h1>
        <p className="text-gray-300/80 mb-6 backdrop-blur-sm bg-white/10 p-2 rounded-lg">
          We're working hard to bring you something amazing. Stay tuned for
          updates!
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
          onClick={() => window.history.back()}
        >
          Go Back
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
