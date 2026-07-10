/**
 * ConfirmDialog.tsx — Confirmation / Save Changes Dialog
 *
 * Purpose: Generic confirmation dialog with optional save/exit
 * flow. Used for save-before-close, delete confirm, unsaved
 * changes, and overwrite warnings.
 */

import { useCallback, useState } from "react";
import Dialog from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  extraLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  onExtra?: () => void;
}

const buttonStyles = {
  base: {
    padding: "6px 16px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    transition: "opacity 0.12s",
  },
  primary: {
    background: "#3a6ea5",
    color: "#fff",
  },
  danger: {
    background: "#a53a3a",
    color: "#fff",
  },
  warning: {
    background: "#a58a3a",
    color: "#fff",
  },
  secondary: {
    background: "#333",
    color: "#aaa",
    border: "1px solid #444",
  },
  extra: {
    background: "transparent",
    color: "#888",
    border: "1px solid #444",
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  extraLabel,
  variant = "info",
  onConfirm,
  onCancel,
  onExtra,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = useCallback(() => {
    setIsProcessing(true);
    onConfirm();
  }, [onConfirm]);

  const getConfirmStyle = () => {
    switch (variant) {
      case "danger":
        return { ...buttonStyles.base, ...buttonStyles.danger };
      case "warning":
        return { ...buttonStyles.base, ...buttonStyles.warning };
      default:
        return { ...buttonStyles.base, ...buttonStyles.primary };
    }
  };

  const footer = (
    <>
      {onExtra && extraLabel && (
        <button
          onClick={onExtra}
          style={{ ...buttonStyles.base, ...buttonStyles.extra, marginRight: "auto" }}
        >
          {extraLabel}
        </button>
      )}
      <button onClick={onCancel} style={{ ...buttonStyles.base, ...buttonStyles.secondary }}>
        {cancelLabel}
      </button>
      <button
        onClick={handleConfirm}
        style={getConfirmStyle()}
        disabled={isProcessing}
      >
        {isProcessing ? "Saving..." : confirmLabel}
      </button>
    </>
  );

  return (
    <Dialog open={open} title={title} onClose={onCancel} footer={footer}>
      <p role="alert" style={{ margin: 0, color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
        {message}
      </p>
    </Dialog>
  );
}
