/**
 * ScreenReaderAnnouncer.tsx — Accessible Live Region
 *
 * Purpose: Provide a screen reader announcement system for important
 * actions (save, export, import, errors). Uses aria-live polite regions
 * so that assistive technology announces messages without interrupting.
 */

import { useState, useCallback, createContext, useContext, useEffect, useRef } from "react";

// ── Context ────────────────────────────────────────────────────────
interface AnnouncerContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AnnouncerContext = createContext<AnnouncerContextType>({
  announce: () => {},
});

// oxlint-disable-next-line react/only-export-components
export function useAnnouncer() {
  return useContext(AnnouncerContext);
}

// ── Provider ───────────────────────────────────────────────────────
export function ScreenReaderAnnouncer({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const politeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "polite") {
      if (politeTimer.current !== null) {
        clearTimeout(politeTimer.current);
      }
      // Clear then re-set via rAF to guarantee re-announcement of duplicate messages
      setPoliteMessage("");
      requestAnimationFrame(() => {
        setPoliteMessage(message);
      });
      politeTimer.current = setTimeout(() => setPoliteMessage(""), 4000);
    } else {
      if (assertiveTimer.current !== null) {
        clearTimeout(assertiveTimer.current);
      }
      setAssertiveMessage("");
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
      });
      assertiveTimer.current = setTimeout(() => setAssertiveMessage(""), 4000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (politeTimer.current !== null) clearTimeout(politeTimer.current);
      if (assertiveTimer.current !== null) clearTimeout(assertiveTimer.current);
    };
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={srOnlyStyle}
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={srOnlyStyle}
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

const srOnlyStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
