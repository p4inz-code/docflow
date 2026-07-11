/**
 * DocumentPropertiesDialog.tsx — Document Properties Dialog
 *
 * Purpose: Display and edit document metadata including author,
 * title, subject, keywords, page count, file info, and statistics.
 */

import { useState, useCallback, useEffect } from "react";
import Dialog from "./Dialog";
import { useActiveDocument } from "../../editor/workspace/WorkspaceStore";

interface DocumentPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function DocumentPropertiesDialog({
  open,
  onClose,
}: DocumentPropertiesDialogProps) {
  const doc = useActiveDocument();
  const [title, setTitle] = useState(doc?.name ?? "");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open && doc) {
      setTitle(doc.name);
    }
  }, [open, doc]);

  const handleSave = useCallback(() => {
    // Future: persist metadata to PDF
    onClose();
  }, [onClose]);

  const footer = (
    <>
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
        Cancel
      </button>
      <button
        onClick={handleSave}
        style={{
          padding: "6px 16px",
          borderRadius: 4,
          border: "none",
          background: "#3a6ea5",
          color: "#fff",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Save
      </button>
    </>
  );

  if (!doc) return null;

  const formField: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    border: "1px solid #3a3a3a",
    borderRadius: 4,
    background: "#1e1e1e",
    color: "#ccc",
    fontSize: 13,
    outline: "none",
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputStyle,
    color: "#666",
    cursor: "default",
  };

  return (
    <Dialog open={open} title="Document Properties" onClose={onClose} footer={footer} width={480}>
      {/* Metadata */}
      <div style={formField}>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={formField}>
        <label style={labelStyle}>Author</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          style={inputStyle}
          placeholder="Not set"
        />
      </div>

      <div style={formField}>
        <label style={labelStyle}>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={inputStyle}
          placeholder="Not set"
        />
      </div>

      <div style={formField}>
        <label style={labelStyle}>Keywords</label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          style={inputStyle}
          placeholder="Comma-separated"
        />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#333", margin: "16px 0" }} />

      {/* File Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={formField}>
          <label style={labelStyle}>File Name</label>
          <div style={readOnlyStyle}>{doc.name}.pdf</div>
        </div>
        <div style={formField}>
          <label style={labelStyle}>File Path</label>
          <div style={readOnlyStyle}>{doc.filePath ?? "Not saved"}</div>
        </div>
        <div style={formField}>
          <label style={labelStyle}>Pages</label>
          <div style={readOnlyStyle}>{doc.pdf?.numPages ?? 0}</div>
        </div>
        <div style={formField}>
          <label style={labelStyle}>Last Saved</label>
          <div style={readOnlyStyle}>
            {doc.savedAt ? new Date(doc.savedAt).toLocaleString() : "Never"}
          </div>
        </div>
        <div style={formField}>
          <label style={labelStyle}>Opened</label>
          <div style={readOnlyStyle}>
            {new Date(doc.openedAt).toLocaleString()}
          </div>
        </div>
        <div style={formField}>
          <label style={labelStyle}>Status</label>
          <div style={{ ...readOnlyStyle, color: doc.isDirty ? "#ffaa00" : "#4caf50" }}>
            {doc.isDirty ? "Unsaved changes" : "Saved"}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
