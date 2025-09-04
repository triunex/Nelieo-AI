import React, { useState, useEffect } from "react";

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

  useEffect(() => {
    // Reset state when text or delay changes
    setDisplayedText("");
    setCurrentIndex(0);
    setDelayDone(typingDelay === 0);
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
      if (onUpdate) onUpdate(text);
      if (onComplete) onComplete();
      return;
    }

    // If an external stop signal is received, immediately finish the typing
    if (stop) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      if (onUpdate) onUpdate(text);
      if (onComplete) onComplete();
      return;
    }

    if (currentIndex < text.length) {
      const timeout = window.setTimeout(() => {
        setDisplayedText((prev) => {
          const next = prev + text[currentIndex];
          if (onUpdate) onUpdate(next);
          return next;
        });
        setCurrentIndex((idx) => idx + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onUpdate, typingDelay, delayDone]);

  return (
    <div className={className}>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </div>
  );
};

export default TypingAnimation;
