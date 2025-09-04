import { createContext, useContext, useState } from "react";

export const FocusContext = createContext(null);

export const FocusProvider = ({ children }) => {
  const [focusMode, setFocusMode] = useState(false);
  const [focusStart, setFocusStart] = useState<number | null>(null);

  const activate = () => {
    setFocusMode(true);
    setFocusStart(Date.now());
  };
  const deactivate = () => {
    setFocusMode(false);
    setFocusStart(null);
  };

  return (
    <FocusContext.Provider value={{ focusMode, focusStart, activate, deactivate }}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => useContext(FocusContext);
