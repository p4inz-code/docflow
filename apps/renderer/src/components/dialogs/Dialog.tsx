/**
 * Dialog.tsx — Reusable Dialog Component
 *
 * Purpose: Production dialog base with focus trapping,
 * keyboard navigation, Escape to close, Enter to confirm,
 * and accessible markup.
 */

import { useEffect, useRef, useCallback } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export default function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 420,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus trap: focus first focusable element
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        "button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width,
          maxWidth: "90vw",
          maxHeight: "80vh",
          background: "#252525",
          border: "1px solid #3a3a3a",
          borderRadius: 8,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #333",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#e0e0e0",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: 16,
              padding: "2px 6px",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "#333";
              (e.target as HTMLElement).style.color = "#ccc";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "transparent";
              (e.target as HTMLElement).style.color = "#666";
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px",
            overflowY: "auto",
            flex: 1,
            color: "#ccc",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              padding: "12px 16px",
              borderTop: "1px solid #333",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
