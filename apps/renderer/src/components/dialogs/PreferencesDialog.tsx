/**
 * PreferencesDialog.tsx — Application Preferences Dialog
 *
 * Purpose: Provide a settings interface for all application preferences.
 * Reads/writes through the SettingsManager.
 */

import { useState, useCallback, useEffect } from "react";
import Dialog from "./Dialog";
import { settingsManager, type AppSettings } from "../../editor/core/Settings";

interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PreferencesDialog({ open, onClose }: PreferencesDialogProps) {
  const [settings, setSettings] = useState<AppSettings>(settingsManager.get());

  useEffect(() => {
    if (open) setSettings(settingsManager.get());
  }, [open]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    settingsManager.update(settings);
    onClose();
  }, [settings, onClose]);

  const handleReset = useCallback(() => {
    settingsManager.reset();
    setSettings(settingsManager.get());
  }, []);

  const footer = (
    <>
      <button
        onClick={handleReset}
        style={{
          padding: "6px 16px",
          borderRadius: 4,
          border: "1px solid #444",
          background: "transparent",
          color: "#888",
          cursor: "pointer",
          fontSize: 12,
          marginRight: "auto",
        }}
      >
        Reset to Defaults
      </button>
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

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #2a2a2a",
  };

  const labelStyle: React.CSSProperties = {
    color: "#ccc",
    fontSize: 13,
  };

  const descStyle: React.CSSProperties = {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  };

  return (
    <Dialog open={open} title="Preferences" onClose={onClose} footer={footer} width={480}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Theme */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Theme</div>
            <div style={descStyle}>Application color theme</div>
          </div>
          <select
            value={settings.theme}
            onChange={(e) => updateSetting("theme", e.target.value as AppSettings["theme"])}
            style={{
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Autosave */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Autosave</div>
            <div style={descStyle}>Automatically save changes</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.autosaveEnabled}
              onChange={(e) => updateSetting("autosaveEnabled", e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            <span style={{ color: settings.autosaveEnabled ? "#4a9eff" : "#666", fontSize: 12 }}>
              {settings.autosaveEnabled ? "On" : "Off"}
            </span>
          </label>
        </div>

        {/* Autosave Interval */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Autosave Interval</div>
            <div style={descStyle}>How often to save automatically</div>
          </div>
          <select
            value={settings.autosaveInterval}
            onChange={(e) => updateSetting("autosaveInterval", parseInt(e.target.value))}
            style={{
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
        </div>

        {/* Default Zoom */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Default Zoom</div>
            <div style={descStyle}>Initial zoom level for documents</div>
          </div>
          <select
            value={settings.defaultZoom}
            onChange={(e) => updateSetting("defaultZoom", parseFloat(e.target.value))}
            style={{
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
          </select>
        </div>

        {/* Recent Files Limit */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Recent Files Limit</div>
            <div style={descStyle}>Number of recent files to remember</div>
          </div>
          <input
            type="number"
            value={settings.recentFilesLimit}
            onChange={(e) => updateSetting("recentFilesLimit", parseInt(e.target.value) || 10)}
            min={5}
            max={50}
            style={{
              width: 60,
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        {/* UI Scale */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>UI Scale</div>
            <div style={descStyle}>Interface scaling factor</div>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.2}
            step={0.05}
            value={settings.uiScale}
            onChange={(e) => updateSetting("uiScale", parseFloat(e.target.value))}
            style={{ width: 120 }}
          />
        </div>

        {/* Virtual Rendering */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Virtual Rendering</div>
            <div style={descStyle}>Only render visible pages</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.virtualRendering}
              onChange={(e) => updateSetting("virtualRendering", e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            <span style={{ color: settings.virtualRendering ? "#4a9eff" : "#666", fontSize: 12 }}>
              {settings.virtualRendering ? "On" : "Off"}
            </span>
          </label>
        </div>

        {/* Render Buffer */}
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Render Buffer</div>
            <div style={descStyle}>Pages to keep rendered off-screen</div>
          </div>
          <input
            type="number"
            value={settings.renderBufferPages}
            onChange={(e) => updateSetting("renderBufferPages", parseInt(e.target.value) || 1)}
            min={0}
            max={5}
            style={{
              width: 60,
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}
