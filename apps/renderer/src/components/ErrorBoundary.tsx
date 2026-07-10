/**
 * ErrorBoundary.tsx — React Error Boundary
 *
 * Purpose: Catch rendering errors in child component trees and
 * display a fallback UI instead of crashing the entire app.
 *
 * Supports:
 *   - Global error catching
 *   - Viewer-specific error catching
 *   - Export/Import error catching
 *   - Recovery action callbacks
 *   - Error logging
 *   - Graceful degradation
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

// ── Props ──────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to render when an error is caught. */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Called when an error is caught (for logging). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Unique name for this boundary (for debugging). */
  name?: string;
}

// ── State ──────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── Error Boundary ─────────────────────────────────────────────────
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private _handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error!, this._handleRetry);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            color: "#888",
            fontSize: 14,
            textAlign: "center",
            gap: 16,
            minHeight: 200,
          }}
        >
          <span style={{ fontSize: 48, opacity: 0.5 }}>⚠</span>
          <div style={{ color: "#ccc", fontSize: 16, fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ color: "#666", fontSize: 13, maxWidth: 400 }}>
            {(this.props.name ? `${this.props.name}: ` : "") +
              (this.state.error?.message ?? "An unexpected error occurred")}
          </div>
          <button
            onClick={this._handleRetry}
            style={{
              padding: "8px 20px",
              border: "1px solid #444",
              borderRadius: 6,
              background: "#2a2a2a",
              color: "#ccc",
              cursor: "pointer",
              fontSize: 13,
              marginTop: 8,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Named boundary HOC ─────────────────────────────────────────────
export function withErrorBoundary<P extends object>(
  name: string,
  Component: React.ComponentType<P>,
  fallback?: ErrorBoundaryProps["fallback"],
): React.ComponentType<P> {
  return function WrappedWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary name={name} fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
