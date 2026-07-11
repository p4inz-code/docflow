/**
 * AboutDialog.tsx — About Docflow Dialog
 *
 * Purpose: Display application information, version, credits, and links.
 */

import Dialog from "./Dialog";
import { FileText } from "../Icons";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const footer = (
    <button
      onClick={onClose}
      style={{
        padding: "6px 16px",
        borderRadius: 4,
        border: "1px solid #444",
        background: "#333",
        color: "#aaa",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      Close
    </button>
  );

  return (
    <Dialog open={open} title="About Docflow" onClose={onClose} footer={footer} width={400}>
      <div aria-describedby="about-description">
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ marginBottom: 12 }}>
          <FileText size={48} style={{ opacity: 0.8 }} aria-hidden="true" />
        </div>
        <h3
          style={{
            color: "#e0e0e0",
            fontSize: 18,
            fontWeight: 600,
            margin: "0 0 4px",
          }}
        >
          Docflow
        </h3>
        <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>
          Version 1.0.0
        </p>
        <p id="about-description" style={{ color: "#999", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          A professional PDF editing workspace with multi-document support,
          annotations, and a full editing engine.
        </p>

        <div
          style={{
            height: 1,
            background: "#2a2a2a",
            margin: "16px 0",
          }}
        />

        <div style={{ color: "#666", fontSize: 11, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            Built with React, Zustand, pdf-lib, and pdfjs-dist
          </p>
          <p style={{ margin: "4px 0 0" }}>
            &copy; {new Date().getFullYear()} Docflow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
    </Dialog>
  );
}
