import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Ensure this file exists for styling
import { applyTheme, getStoredTheme } from "@/utils/theme";
// Lenis for smooth scrolling
import Lenis from "lenis";

applyTheme(getStoredTheme());

// Initialize Lenis for global smooth scrolling
const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Make Lenis instance available on window for debug/advanced usage
(window as any).lenis = lenis;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
