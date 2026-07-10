/**
 * InspectorPanel.tsx — Properties Inspector Panel
 *
 * Purpose: A dynamic right-side panel that displays and edits
 * properties of the currently selected object.
 *
 * Sections adapt to the object type:
 *   - Text: font, size, weight, color, alignment, opacity, rotation
 *   - Shape: fill, stroke, stroke width, radius
 *   - Image: opacity, rotation, lock aspect ratio
 *   - Drawing: brush width, stroke color
 *   - Highlight: opacity, color
 *   - Signature: opacity, rotation
 *   - Stamp: preset, text, color
 *
 * Every edit goes through EditPropertiesCommand for undo support.
 */

import { useCallback, useMemo } from "react";
import { useEditorStore } from "../editor/state/editorStore";
import type { EditableObject } from "../editor/types/objects";
import ImageEditorPanel from "./ImageEditorPanel";

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  panel: {
    width: 260,
    minWidth: 260,
    background: "#1a1a1a",
    borderLeft: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column" as const,
    overflowY: "auto" as const,
  },
  header: {
    padding: "10px 12px",
    borderBottom: "1px solid #2a2a2a",
    color: "#aaa",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
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
    width: 120,
    padding: "3px 6px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: "#252525",
    color: "#ccc",
    fontSize: 12,
    outline: "none",
  },
  select: {
    width: 134,
    padding: "3px 6px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: "#252525",
    color: "#ccc",
    fontSize: 12,
    outline: "none",
  },
  colorInput: {
    width: 30,
    height: 24,
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    padding: 0,
    cursor: "pointer",
    background: "none",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#555",
    fontSize: 13,
    padding: 20,
    textAlign: "center" as const,
  },
};

// ── Color presets ──────────────────────────────────────────────────
const COLOR_PRESETS = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#ff00ff", "#00ffff", "#888888", "#ff8800",
];

// ── Inspector Panel ────────────────────────────────────────────────
export default function InspectorPanel() {
  const activeId = useEditorStore((s) => s.activeId);
  const overlayObjects = useEditorStore((s) => s.overlayObjects);
  const updateOverlayObject = useEditorStore((s) => s.updateOverlayObject);

  const activeObject = useMemo(
    () => overlayObjects.find((o) => o.id === activeId) ?? null,
    [overlayObjects, activeId],
  );

  if (!activeObject) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>Properties</div>
        <div style={styles.empty}>
          Select an object to edit its properties
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Properties</div>

      {/* ── Position & Size (all types) ── */}
      <TransformSection object={activeObject} onUpdate={updateOverlayObject} />

      {/* ── Type-specific sections ── */}
      {activeObject.type === "text" && (
        <TextSection object={activeObject} onUpdate={updateOverlayObject} />
      )}
      {activeObject.type === "shape" && (
        <ShapeSection object={activeObject} onUpdate={updateOverlayObject} />
      )}
      {activeObject.type === "image" && (
        <ImageEditorPanel object={activeObject} />
      )}
      {activeObject.type === "signature" && (
        <ImageSection object={activeObject} onUpdate={updateOverlayObject} />
      )}
      {activeObject.type === "drawing" && (
        <DrawingSection object={activeObject} onUpdate={updateOverlayObject} />
      )}
      {activeObject.type === "highlight" && (
        <HighlightSection object={activeObject} onUpdate={updateOverlayObject} />
      )}
      {activeObject.type === "stamp" && (
        <StampSection object={activeObject} onUpdate={updateOverlayObject} />
      )}

      {/* ── Common properties ── */}
      <OpacitySection object={activeObject} onUpdate={updateOverlayObject} />
    </div>
  );
}

// ── Section Components ─────────────────────────────────────────────

function TransformSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const setPos = useCallback((field: "x" | "y", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onUpdate(object.id, {
      position: { ...object.position, [field]: num },
    });
  }, [object.id, object.position, onUpdate]);

  const setSize = useCallback((field: "width" | "height", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 1) return;
    onUpdate(object.id, {
      size: { ...object.size, [field]: num },
    });
  }, [object.id, object.size, onUpdate]);

  const setRotation = useCallback((value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onUpdate(object.id, { rotation: num });
  }, [object.id, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Transform</div>
      <div style={styles.field}>
        <span style={styles.label}>X</span>
        <input
          style={styles.input}
          type="number"
          value={Math.round(object.position.x)}
          onChange={(e) => setPos("x", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Y</span>
        <input
          style={styles.input}
          type="number"
          value={Math.round(object.position.y)}
          onChange={(e) => setPos("y", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Width</span>
        <input
          style={styles.input}
          type="number"
          value={Math.round(object.size.width)}
          onChange={(e) => setSize("width", e.target.value)}
          min={1}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Height</span>
        <input
          style={styles.input}
          type="number"
          value={Math.round(object.size.height)}
          onChange={(e) => setSize("height", e.target.value)}
          min={1}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Rotation</span>
        <input
          style={styles.input}
          type="number"
          value={Math.round(object.rotation)}
          onChange={(e) => setRotation(e.target.value)}
        />
      </div>
    </div>
  );
}

function TextSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const data = object.data as Record<string, unknown>;

  const updateData = useCallback((field: string, value: unknown) => {
    onUpdate(object.id, {
      data: { ...object.data, [field]: value },
    });
  }, [object.id, object.data, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Text</div>
      <div style={styles.field}>
        <span style={styles.label}>Font</span>
        <input
          style={styles.input}
          value={(data.fontFamily as string) ?? ""}
          onChange={(e) => updateData("fontFamily", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Size</span>
        <input
          style={styles.input}
          type="number"
          value={(data.fontSize as number) ?? 16}
          onChange={(e) => updateData("fontSize", parseFloat(e.target.value) || 16)}
          min={4}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Weight</span>
        <select
          style={styles.select}
          value={(data.fontWeight as number) ?? 400}
          onChange={(e) => updateData("fontWeight", parseInt(e.target.value))}
        >
          <option value="300">Light</option>
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semi-Bold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
        </select>
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Color</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            style={styles.colorInput}
            type="color"
            value={(data.color as string) ?? "#000000"}
            onChange={(e) => updateData("color", e.target.value)}
          />
          <span style={{ color: "#888", fontSize: 10 }}>
            {(data.color as string) ?? "#000000"}
          </span>
        </div>
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Align</span>
        <select
          style={styles.select}
          value={(data.textAlign as string) ?? "left"}
          onChange={(e) => updateData("textAlign", e.target.value)}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}

function ShapeSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const data = object.data as Record<string, unknown>;

  const updateData = useCallback((field: string, value: unknown) => {
    onUpdate(object.id, {
      data: { ...object.data, [field]: value },
    });
  }, [object.id, object.data, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Shape</div>
      <div style={styles.field}>
        <span style={styles.label}>Fill</span>
        <input
          style={styles.colorInput}
          type="color"
          value={(data.fillColor as string) ?? "#ffffff"}
          onChange={(e) => updateData("fillColor", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Stroke</span>
        <input
          style={styles.colorInput}
          type="color"
          value={(data.strokeColor as string) ?? "#000000"}
          onChange={(e) => updateData("strokeColor", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Width</span>
        <input
          style={styles.input}
          type="number"
          value={(data.strokeWidth as number) ?? 2}
          onChange={(e) => updateData("strokeWidth", parseFloat(e.target.value) || 2)}
          min={0}
        />
      </div>
      {(data.shapeType as string) === "rectangle" && (
        <div style={styles.field}>
          <span style={styles.label}>Radius</span>
          <input
            style={styles.input}
            type="number"
            value={(data.cornerRadius as number) ?? 0}
            onChange={(e) => updateData("cornerRadius", parseFloat(e.target.value) || 0)}
            min={0}
          />
        </div>
      )}
    </div>
  );
}

function ImageSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Image</div>
      <div style={{ color: "#888", fontSize: 11, lineHeight: 1.5 }}>
        {object.type === "image" ? "Image object" : "Signature object"}
      </div>
      <div style={{ color: "#666", fontSize: 10, marginTop: 4, wordBreak: "break-all" }}>
        {(object.data as Record<string, unknown>).src
          ? "Has image data"
          : "No image data"}
      </div>
    </div>
  );
}

function DrawingSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const data = object.data as Record<string, unknown>;

  const updateData = useCallback((field: string, value: unknown) => {
    onUpdate(object.id, {
      data: { ...object.data, [field]: value },
    });
  }, [object.id, object.data, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Drawing</div>
      <div style={styles.field}>
        <span style={styles.label}>Color</span>
        <input
          style={styles.colorInput}
          type="color"
          value={(data.strokeColor as string) ?? "#000000"}
          onChange={(e) => updateData("strokeColor", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Width</span>
        <input
          style={styles.input}
          type="number"
          value={(data.strokeWidth as number) ?? 3}
          onChange={(e) => updateData("strokeWidth", parseFloat(e.target.value) || 3)}
          min={1}
        />
      </div>
    </div>
  );
}

function HighlightSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const data = object.data as Record<string, unknown>;

  const updateData = useCallback((field: string, value: unknown) => {
    onUpdate(object.id, {
      data: { ...object.data, [field]: value },
    });
  }, [object.id, object.data, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Highlight</div>
      <div style={styles.field}>
        <span style={styles.label}>Color</span>
        <input
          style={styles.colorInput}
          type="color"
          value={(data.color as string) ?? "#ffff00"}
          onChange={(e) => updateData("color", e.target.value)}
        />
      </div>
    </div>
  );
}

function StampSection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const data = object.data as Record<string, unknown>;

  const updateData = useCallback((field: string, value: unknown) => {
    onUpdate(object.id, {
      data: { ...object.data, [field]: value },
    });
  }, [object.id, object.data, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Stamp</div>
      <div style={styles.field}>
        <span style={styles.label}>Text</span>
        <input
          style={styles.input}
          value={(data.text as string) ?? ""}
          onChange={(e) => updateData("text", e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <span style={styles.label}>Color</span>
        <input
          style={styles.colorInput}
          type="color"
          value={(data.color as string) ?? "#ff0000"}
          onChange={(e) => updateData("color", e.target.value)}
        />
      </div>
    </div>
  );
}

function OpacitySection({ object, onUpdate }: { object: EditableObject; onUpdate: (id: string, updates: Partial<EditableObject>) => void }) {
  const setOpacity = useCallback((value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onUpdate(object.id, { opacity: Math.max(0, Math.min(1, num)) });
  }, [object.id, onUpdate]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Appearance</div>
      <div style={styles.field}>
        <span style={styles.label}>Opacity</span>
        <input
          style={styles.input}
          type="number"
          value={object.opacity}
          onChange={(e) => setOpacity(e.target.value)}
          min={0}
          max={1}
          step={0.05}
        />
      </div>
    </div>
  );
}
