/**
 * ImageEditorPanel.tsx — Image Editing Panel
 *
 * Purpose: Provide a production-quality image editing panel for
 * ImageObject instances. Controls for crop (non-destructive),
 * resize with aspect lock, rotation, flip, opacity, border,
 * shadow, and corner radius.
 *
 * Integrates with the InspectorPanel and editor store.
 */

import { useCallback } from "react";
import { useEditorStore } from "../editor/state/editorStore";
import type { EditableObject } from "../editor/types/objects";

interface ImageEditorPanelProps {
  object: EditableObject;
}

const styles = {
  section: {
    padding: "8px 12px",
    borderBottom: "1px solid #252525",
  },
  sectionTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
    marginBottom: 8,
  },
  field: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    color: "#999",
    fontSize: 12,
    flexShrink: 0,
    minWidth: 70,
  },
  input: {
    width: 100,
    padding: "3px 6px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: "#252525",
    color: "#ccc",
    fontSize: 12,
    outline: "none",
  } as React.CSSProperties,
  button: {
    padding: "4px 10px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: "#252525",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 11,
    transition: "background 0.1s",
  } as React.CSSProperties,
  buttonActive: {
    padding: "4px 10px",
    border: "1px solid #4a9eff",
    borderRadius: 3,
    background: "#2a3a4a",
    color: "#4a9eff",
    cursor: "pointer",
    fontSize: 11,
  } as React.CSSProperties,
};

export default function ImageEditorPanel({ object }: ImageEditorPanelProps) {
  const updateOverlayObject = useEditorStore((s) => s.updateOverlayObject);
  const imageData = object.data as Record<string, unknown>;

  const updateData = useCallback(
    (field: string, value: unknown) => {
      updateOverlayObject(object.id, {
        data: { ...object.data, [field]: value },
      });
    },
    [object.id, object.data, updateOverlayObject],
  );

  const updateTransform = useCallback(
    (changes: Partial<EditableObject>) => {
      updateOverlayObject(object.id, changes);
    },
    [object.id, updateOverlayObject],
  );

  return (
    <>
      {/* Transform */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Transform</div>
        <div style={styles.field}>
          <span style={styles.label}>Width</span>
          <input
            style={styles.input}
            type="number"
            value={Math.round(object.size.width)}
            onChange={(e) => {
              const w = parseInt(e.target.value) || 1;
              const locked = imageData.aspectLock as boolean;
              if (locked) {
                const ratio = object.size.height / object.size.width;
                updateTransform({
                  size: { width: w, height: Math.round(w * ratio) },
                });
              } else {
                updateTransform({ size: { ...object.size, width: w } });
              }
            }}
            min={1}
          />
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Height</span>
          <input
            style={styles.input}
            type="number"
            value={Math.round(object.size.height)}
            onChange={(e) => {
              const h = parseInt(e.target.value) || 1;
              const locked = imageData.aspectLock as boolean;
              if (locked) {
                const ratio = object.size.width / object.size.height;
                updateTransform({
                  size: { width: Math.round(h * ratio), height: h },
                });
              } else {
                updateTransform({ size: { ...object.size, height: h } });
              }
            }}
            min={1}
          />
        </div>
        <div style={styles.field}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: imageData.aspectLock ? "#4a9eff" : "#888",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={(imageData.aspectLock as boolean) ?? false}
              onChange={(e) => updateData("aspectLock", e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            Constrain proportions
          </label>
        </div>
      </div>

      {/* Rotation & Flip */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Rotation & Flip</div>
        <div style={styles.field}>
          <span style={styles.label}>Rotation</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              style={styles.button}
              onClick={() => {
                const rot = ((object.rotation - 90 + 360) % 360);
                updateTransform({ rotation: rot });
              }}
            >
              ↺ -90°
            </button>
            <button
              style={styles.button}
              onClick={() => {
                const rot = (object.rotation + 90) % 360;
                updateTransform({ rotation: rot });
              }}
            >
              ↻ +90°
            </button>
          </div>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Flip</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              style={{
                ...(styles.button as React.CSSProperties),
                color: imageData.flipH ? "#4a9eff" : "#aaa",
                borderColor: imageData.flipH ? "#4a9eff" : "#3a3a3a",
              }}
              onClick={() => updateData("flipH", !imageData.flipH)}
            >
              ↔ Horizontal
            </button>
            <button
              style={{
                ...(styles.button as React.CSSProperties),
                color: imageData.flipV ? "#4a9eff" : "#aaa",
                borderColor: imageData.flipV ? "#4a9eff" : "#3a3a3a",
              }}
              onClick={() => updateData("flipV", !imageData.flipV)}
            >
              ↕ Vertical
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Appearance</div>
        <div style={styles.field}>
          <span style={styles.label}>Opacity</span>
          <input
            style={{ ...styles.input, width: 80 }}
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={object.opacity}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) updateTransform({ opacity: Math.max(0, Math.min(1, v)) });
            }}
          />
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Border</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            max={20}
            value={(imageData.borderWidth as number) ?? 0}
            onChange={(e) => updateData("borderWidth", parseInt(e.target.value) || 0)}
          />
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Border color</span>
          <input
            type="color"
            value={(imageData.borderColor as string) ?? "#000000"}
            onChange={(e) => updateData("borderColor", e.target.value)}
            style={{
              width: 30,
              height: 24,
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              padding: 0,
              cursor: "pointer",
              background: "none",
            }}
          />
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Corner radius</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            max={50}
            value={(imageData.cornerRadius as number) ?? 0}
            onChange={(e) => updateData("cornerRadius", parseInt(e.target.value) || 0)}
          />
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Shadow</span>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: imageData.shadow ? "#4a9eff" : "#888",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={(imageData.shadow as boolean) ?? false}
              onChange={(e) => updateData("shadow", e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            Enable
          </label>
        </div>
      </div>

      {/* Image Info */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Info</div>
        <div style={{ color: "#888", fontSize: 11, lineHeight: 1.5 }}>
          <div>Type: {(imageData.mimeType as string) ?? "Unknown"}</div>
          <div>
            Original: {imageData.originalWidth as number} ×{" "}
            {imageData.originalHeight as number}
          </div>
          <div>
            Size: {Math.round(object.size.width)} ×{" "}
            {Math.round(object.size.height)}
          </div>
        </div>
      </div>
    </>
  );
}
