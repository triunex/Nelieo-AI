import React, { useState, useEffect, useRef } from "react";

interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onUpdate?: (partial: string) => void;
  className?: string;
  typingDelay?: number;
  stop?: boolean;
}

const TypingAnimation = ({
  text,
  speed = 0,
  onComplete,
  onUpdate,
  className,
  typingDelay = 0,
  stop = false,
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [delayDone, setDelayDone] = useState(typingDelay === 0);
  const completedRef = useRef(false);

  useEffect(() => {
    // Reset state when text or delay changes
    setDisplayedText("");
    setCurrentIndex(0);
    setDelayDone(typingDelay === 0);
    completedRef.current = false;
  }, [text, typingDelay]);

  useEffect(() => {
    // Handle initial delay via state to trigger re-render
    let delayTimer: number | undefined;
    if (!delayDone && typingDelay > 0) {
      delayTimer = window.setTimeout(() => setDelayDone(true), typingDelay);
      return () => clearTimeout(delayTimer);
    }

    if (!delayDone) return;

    // If speed is 0 or negative, skip per-character typing and show full text
    if (speed <= 0) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    // If an external stop signal is received, immediately finish the typing
    if (stop) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    if (currentIndex < text.length) {
      const timeout = window.setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((idx) => idx + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed, onComplete, onUpdate, typingDelay, delayDone]);

  // Notify parent of updates AFTER render commit
  useEffect(() => {
    if (onUpdate) onUpdate(displayedText);
  }, [displayedText, onUpdate]);

  // Fire onComplete once when typing finishes
  useEffect(() => {
    if (!completedRef.current && displayedText.length === text.length) {
      completedRef.current = true;
      if (onComplete) onComplete();
    }
  }, [displayedText, text, onComplete]);

  return (
    <div className={className}>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </div>
  );
};

export default TypingAnimation;
