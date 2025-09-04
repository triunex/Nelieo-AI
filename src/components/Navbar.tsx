import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import clsx from "clsx";

const Navbar = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const pillNavClass = clsx(
    "inline-flex items-center rounded-full px-3 py-1.5 shadow-sm",
    isLight
      ? "bg-gradient-to-r from-white to-gray-50 border border-gray-200 ring-1 ring-gray-100 shadow-sm"
      : "bg-white/5 backdrop-blur-sm border-2 border-white/20"
  );

  const pillLinkClass = (isLight: boolean) =>
    clsx(
      "px-5 py-2 text-sm rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      isLight
        ? "text-gray-800 hover:text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-200"
        : "text-gray-200 hover:text-white hover:bg-white/3 focus-visible:ring-white/20"
    );

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md border-b border-transparent transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + text */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center space-x-2">
              <motion.img
                src="/favicon.png"
                alt="Logo"
                className="h-10 w-10 rounded"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.25 }}
              />
              <motion.span
                className="font-bold text-lg navbar-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                Nelieo.<span className="glow-text-purple">AI</span>
              </motion.span>
            </Link>
          </div>

          {/* Center: pill-style segmented nav (nudged right for visual centering) */}
          <div className="hidden md:flex items-center justify-center flex-1 ml-12">
            <nav aria-label="primary" className={pillNavClass}>
              <a href="#features" className={pillLinkClass(isLight)}>
                Features
              </a>
              <a href="#pricing" className={pillLinkClass(isLight)}>
                Pricing
              </a>
              <a href="#faq" className={pillLinkClass(isLight)}>
                FAQs
              </a>
              <a href="#" className={pillLinkClass(isLight)}>
                Docs
              </a>
            </nav>
          </div>

          {/* Right: ThemeToggle, Try Now (login removed) */}
          <div className="flex items-center gap-4 ml-6">
            <div className="mr-2">
              <ThemeToggle />
            </div>
            <Link to="/auth">
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.18 }}
              >
                <Button className="ml-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-all duration-300">
                  <span className="hidden sm:inline">Try Now</span>
                  <span className="sm:hidden">Try it</span>
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
