import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MonitorSmartphone, Command, Zap } from "lucide-react";

const DemoSection = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <section id="demo" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Demo heading and single-line text (minimal) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-4xl font-bold">Cogn OS</h2>
            <p className="text-lg text-gray-300">
              Our World's Most Advanced and First Agentic AI Operating System.
              Work at the speed of thought. Cogn OS thinks with you, learns from
              you, and gets smarter every day.
            </p>
          </motion.div>

          {/* Right side - Video Demo */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Layered glows for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-[28px] blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-rose-500/10 rounded-[28px] blur-3xl transform rotate-12" />

            {/* Video Container */}
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-2 overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3),0_0_80px_-12px_rgba(255,140,50,0.2)] will-change-transform">
              <div
                className="relative aspect-[16/9] w-full rounded-2xl bg-black/40 overflow-hidden"
                onClick={() => setIsFullScreen(true)}
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/placeholder.png"
                >
                  <source src="/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Second demo row: video on left, text on right (Agentic Search) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: smaller Video Container */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="relative"
          >
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-2 overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3),0_0_80px_-12px_rgba(255,140,50,0.18)] will-change-transform max-w-xl mx-auto">
              <div
                className="relative aspect-[16/9] w-full rounded-2xl bg-black/40 overflow-hidden"
                onClick={() => setIsFullScreen(true)}
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/placeholder.png"
                >
                  <source src="/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </motion.div>

          {/* Right: concise Agentic Search text */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="space-y-4 lg:pl-8"
          >
            <h3 className="text-2xl lg:text-3xl font-semibold">
              Agentic Search
            </h3>
            <p className="text-lg text-gray-300">
              Answers that anticipate. Agentic Search understands context,
              reasons deeply, and moves faster than any search before.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Third demo row: text left, video on right (Most Advanced Chat) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Chat text */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="space-y-4 lg:pr-8"
          >
            <h3 className="text-2xl lg:text-3xl font-semibold">
            Advanced Chat
            </h3>
            <p className="text-lg text-gray-300">
              Chat, but evolved. Built for long-form reasoning, multi-step
              workflows, and human-like memory, Nelieo Chat is more than talk.
              It builds Arsenals to automate your tasks, designs stunning
              charts, and creates images or videos on command. It’s your
              creative partner, problem-solver, and assistant, all in one.
            </p>
          </motion.div>

          {/* Right: Video Container (match frame styling) */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="relative"
          >
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-2 overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3),0_0_80px_-12px_rgba(255,140,50,0.18)] will-change-transform">
              <div
                className="relative aspect-[16/9] w-full rounded-2xl bg-black/40 overflow-hidden"
                onClick={() => setIsFullScreen(true)}
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/placeholder.png"
                >
                  <source src="/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fullscreen Video Overlay */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setIsFullScreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-[90vw] max-w-7xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
                poster="/placeholder.png"
              >
                <source src="/demo.mp4" type="video/mp4" />
              </video>

              {/* Close button */}
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white/90 hover:text-white transition-all duration-300"
                onClick={() => setIsFullScreen(false)}
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default DemoSection;
