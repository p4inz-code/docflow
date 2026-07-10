import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ── Unhandled promise rejection handler ──
window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled promise rejection:", event.reason);
  }
});

// ── Window error handler ──
window.addEventListener("error", (event: ErrorEvent) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled error:", event.error ?? event.message);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary name="Global">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
