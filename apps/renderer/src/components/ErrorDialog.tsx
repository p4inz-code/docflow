/**
 * ErrorDialog.tsx — Error Dialog Component
 *
 * Purpose: Display user-friendly error dialogs for recoverable
 * and non-recoverable errors. Supports action buttons for
 * retry, save, discard, and close.
 *
 * Features:
 *   - Stackable error queue
 *   - Action buttons (Retry, Dismiss)
 *   - Error category display
 *   - Optional recovery prompt
 *   - Auto-dismiss for recoverable errors (configurable)
 */

import { useState, useCallback, createContext, useContext } from "react";

// ── Error Entry ────────────────────────────────────────────────────
export interface ErrorEntry {
  id: string;
  title: string;
  message: string;
  category: string;
  recoverable: boolean;
  timestamp: number;
  actions?: ErrorAction[];
  details?: Record<string, unknown>;
}

export interface ErrorAction {
  label: string;
  primary?: boolean;
  action: () => void;
}

// ── Error Context ──────────────────────────────────────────────────
interface ErrorContextType {
  errors: ErrorEntry[];
  showError: (error: ErrorEntry) => void;
  dismissError: (id: string) => void;
  clearAll: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  errors: [],
  showError: () => {},
  dismissError: () => {},
  clearAll: () => {},
});

export function useErrorHandler() {
  return useContext(ErrorContext);
}

// ── Error Provider ─────────────────────────────────────────────────
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  const showError = useCallback((error: ErrorEntry) => {
    setErrors((prev) => [...prev, error]);

    // Auto-dismiss recoverable errors after 8 seconds
    if (error.recoverable) {
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== error.id));
      }, 8000);
    }
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider
      value={{ errors, showError, dismissError, clearAll }}
    >
      {children}

      {/* Error toasts */}
      {errors.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 40,
            right: 20,
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 380,
          }}
        >
          {errors.map((error) => (
            <div
              key={error.id}
              style={{
                background: error.recoverable ? "#2a2a2a" : "#3a1a1a",
                border: error.recoverable
                  ? "1px solid #3a3a3a"
                  : "1px solid #5a2a2a",
                borderRadius: 6,
                padding: "10px 14px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                animation: "slideIn 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    color: error.recoverable ? "#ffaa00" : "#ff5555",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {error.title}
                </span>
                <span style={{ color: "#555", fontSize: 10 }}>
                  {error.category}
                </span>
              </div>
              <p style={{ color: "#aaa", fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                {error.message}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {(error.actions ?? []).map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    style={{
                      padding: "3px 10px",
                      border: action.primary
                        ? "none"
                        : "1px solid #3a3a3a",
                      borderRadius: 3,
                      background: action.primary ? "#3a6ea5" : "transparent",
                      color: action.primary ? "#fff" : "#aaa",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  onClick={() => dismissError(error.id)}
                  style={{
                    padding: "3px 10px",
                    border: "1px solid #3a3a3a",
                    borderRadius: 3,
                    background: "transparent",
                    color: "#666",
                    cursor: "pointer",
                    fontSize: 11,
                    marginLeft: "auto",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ErrorContext.Provider>
  );
}
