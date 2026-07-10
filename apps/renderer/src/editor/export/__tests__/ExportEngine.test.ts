/**
 * Export Engine — Unit Tests
 *
 * Tests for core export modules: ExportEngine, FileSerializer,
 * FileDeserializer, Validator, ProgressReporter, SaveManager.
 *
 * Note: Full PDF export tests require actual PDF byte data which
 * is not available in unit test isolation. These tests focus on
 * the pure-logic modules that don't require PDF loading.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Validator Tests ────────────────────────────────────────────────
import { Validator } from "../Validation";

describe("Validator", () => {
  const validator = new Validator();

  it("should pass validation with valid objects", () => {
    const result = validator.validate(
      [
        {
          id: "obj-1",
          type: "text",
          page: 1,
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          selected: false,
          createdAt: 1000,
          updatedAt: 1000,
          data: { content: "Hello" },
        } as any,
      ],
      3,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.objectsChecked).toBe(1);
  });

  it("should detect duplicate IDs", () => {
    const obj = {
      id: "dup-id",
      type: "text",
      page: 1,
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: false,
      createdAt: 1000,
      updatedAt: 1000,
      data: {},
    };

    const result = validator.validate([obj, { ...obj }] as any, 3);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].message).toContain("Duplicate");
  });

  it("should detect invalid coordinates", () => {
    const result = validator.validate(
      [
        {
          id: "bad-pos",
          type: "text",
          page: 1,
          position: { x: NaN, y: 100 },
          size: { width: 200, height: 50 },
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          selected: false,
          createdAt: 1000,
          updatedAt: 1000,
          data: {},
        } as any,
      ],
      3,
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Invalid position");
  });

  it("should warn on out-of-range pages", () => {
    const result = validator.validate(
      [
        {
          id: "bad-page",
          type: "text",
          page: 99,
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          selected: false,
          createdAt: 1000,
          updatedAt: 1000,
          data: {},
        } as any,
      ],
      3,
    );

    expect(result.valid).toBe(true); // Warnings don't make it invalid
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0].message).toContain("page 99");
  });

  it("should warn on blob: URLs for images", () => {
    const result = validator.validate(
      [
        {
          id: "img-blob",
          type: "image",
          page: 1,
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          selected: false,
          createdAt: 1000,
          updatedAt: 1000,
          data: { src: "blob:some-uuid" },
        } as any,
      ],
      3,
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0].message).toContain("blob:");
  });
});

// ── ProgressReporter Tests ─────────────────────────────────────────
import { ProgressReporter } from "../ProgressReporter";

describe("ProgressReporter", () => {
  let reporter: ProgressReporter;

  beforeEach(() => {
    reporter = new ProgressReporter();
  });

  it("should start with default values", () => {
    const progress = reporter.getProgress();
    expect(progress.stage).toBe("");
    expect(progress.overall).toBe(0);
    expect(progress.cancelled).toBe(false);
    expect(progress.error).toBeNull();
  });

  it("should track stage changes", () => {
    reporter.setStage("Exporting");
    expect(reporter.getProgress().stage).toBe("Exporting");
  });

  it("should clamp overall progress to 0-1", () => {
    reporter.setOverall(1.5);
    expect(reporter.getProgress().overall).toBe(1);

    reporter.setOverall(-0.5);
    expect(reporter.getProgress().overall).toBe(0);
  });

  it("should support cancellation", () => {
    expect(reporter.isCancelled).toBe(false);
    reporter.cancel();
    expect(reporter.isCancelled).toBe(true);
  });

  it("should reset to initial state", () => {
    reporter.setStage("Exporting");
    reporter.setOverall(0.5);
    reporter.cancel();

    reporter.reset();

    const progress = reporter.getProgress();
    expect(progress.stage).toBe("");
    expect(progress.overall).toBe(0);
    expect(progress.cancelled).toBe(false);
  });

  it("should call the progress callback", () => {
    const callback = vi.fn();
    reporter.onProgress = callback;

    reporter.setOverall(0.5);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 0.5 }),
    );
  });
});

// ── ExportSettings Tests ───────────────────────────────────────────
import { ExportSettingsManager } from "../ExportSettings";

describe("ExportSettingsManager", () => {
  let settings: ExportSettingsManager;

  beforeEach(() => {
    settings = new ExportSettingsManager();
  });

  it("should return default settings", () => {
    const config = settings.get();
    expect(config.includeOverlays).toBe(true);
    expect(config.flatten).toBe(true);
    expect(config.compressionLevel).toBe(6);
  });

  it("should support partial updates", () => {
    settings.update({ compressionLevel: 9, author: "Test User" });
    const config = settings.get();
    expect(config.compressionLevel).toBe(9);
    expect(config.author).toBe("Test User");
    expect(config.includeOverlays).toBe(true); // unchanged
  });

  it("should support max quality preset", () => {
    settings.setMaxQuality();
    expect(settings.get().compressionLevel).toBe(9);
    expect(settings.get().embedFonts).toBe(true);
  });

  it("should support min size preset", () => {
    settings.setMinSize();
    expect(settings.get().compressionLevel).toBe(0);
    expect(settings.get().embedFonts).toBe(false);
  });

  it("should reset to defaults", () => {
    settings.update({ compressionLevel: 0, author: "Custom" });
    settings.reset();
    const config = settings.get();
    expect(config.compressionLevel).toBe(6);
    expect(config.author).toBe("Docflow");
  });
});

// ── FileSerializer / FileDeserializer Tests ────────────────────────
import { FileSerializer } from "../FileSerializer";
import { FileDeserializer } from "../FileDeserializer";

describe("FileSerializer & FileDeserializer", () => {
  const serializer = new FileSerializer();
  const deserializer = new FileDeserializer();

  it("should round-trip serialize and deserialize", () => {
    const objects = [
      {
        id: "test-1",
        type: "text",
        page: 1,
        position: { x: 100, y: 200 },
        size: { width: 300, height: 50 },
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        selected: false,
        createdAt: 1000,
        updatedAt: 1000,
        data: { content: "Hello" },
      },
    ] as any;

    const json = serializer.serialize(objects, {
      title: "Test Doc",
      author: "Tester",
      subject: "Testing",
      keywords: "test",
    }, {
      activePage: 1,
      selectedIds: [],
      activeId: null,
      zoomLevel: 1,
      pan: { x: 0, y: 0 },
    });

    const result = deserializer.deserialize(json);
    expect(result.success).toBe(true);
    expect(result.document).not.toBeNull();
    expect(result.document!.metadata.title).toBe("Test Doc");
    expect(result.document!.overlayObjects).toHaveLength(1);
    expect(result.document!.overlayObjects[0].id).toBe("test-1");
  });

  it("should reject unsupported format versions", () => {
    const invalidJson = JSON.stringify({
      formatVersion: 99,
      creator: "Future App",
      createdAt: Date.now(),
      overlayObjects: [],
      metadata: { title: "", author: "", subject: "", keywords: "" },
      editorState: { activePage: 1, selectedIds: [], activeId: null, zoomLevel: 1, pan: { x: 0, y: 0 } },
    });

    const result = deserializer.deserialize(invalidJson);
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain("Unsupported");
  });

  it("should reject missing formatVersion", () => {
    const result = deserializer.deserialize(JSON.stringify({}));
    expect(result.success).toBe(false);
  });

  it("should reject invalid JSON", () => {
    const result = deserializer.deserialize("not json at all");
    expect(result.success).toBe(false);
  });

  it("should sanitize NaN values during serialization", () => {
    const objects = [
      {
        id: "nan-obj",
        type: "text",
        page: 1,
        position: { x: NaN, y: Infinity },
        size: { width: -5, height: 0 },
        rotation: NaN,
        opacity: 2,
        locked: false,
        visible: true,
        selected: false,
        createdAt: 1000,
        updatedAt: 1000,
        data: {},
      },
    ] as any;

    const json = serializer.serialize(objects, {
      title: "", author: "", subject: "", keywords: "",
    }, {
      activePage: 1, selectedIds: [], activeId: null, zoomLevel: 1, pan: { x: 0, y: 0 },
    });

    const parsed = JSON.parse(json);
    expect(parsed.overlayObjects[0].position.x).toBe(0);
    expect(parsed.overlayObjects[0].position.y).toBe(0);
    expect(parsed.overlayObjects[0].size.width).toBe(1); // clamped to min 1
    expect(parsed.overlayObjects[0].size.height).toBe(1); // clamped to min 1
    expect(parsed.overlayObjects[0].rotation).toBe(0);
    expect(parsed.overlayObjects[0].opacity).toBe(1); // clamped to max 1
  });

  it("should restore defaults for missing fields on deserialization", () => {
    const json = JSON.stringify({
      formatVersion: 1,
      creator: "Docflow",
      createdAt: Date.now(),
      overlayObjects: [
        { id: "minimal-obj", type: "text" }, // minimal — missing many fields
      ],
      metadata: { title: "", author: "", subject: "", keywords: "" },
      editorState: { activePage: 1, selectedIds: [], activeId: null, zoomLevel: 1, pan: { x: 0, y: 0 } },
    });

    const result = deserializer.deserialize(json);
    expect(result.success).toBe(true);
    const obj = result.document!.overlayObjects[0];
    expect(obj.id).toBe("minimal-obj");
    expect(obj.page).toBe(1);
    expect(obj.position.x).toBe(0);
    expect(obj.selected).toBe(false);
    expect(obj.visible).toBe(true);
  });
});

// ── SaveManager Tests ──────────────────────────────────────────────
import { SaveManager } from "../SaveManager";

describe("SaveManager", () => {
  let saveManager: SaveManager;
  let mockCallbacks: any;

  beforeEach(() => {
    saveManager = new SaveManager();
    mockCallbacks = {
      writeFile: vi.fn().mockResolvedValue(undefined),
      writeProjectFile: vi.fn().mockResolvedValue(undefined),
      getObjects: vi.fn().mockReturnValue([]),
      getMetadata: vi.fn().mockReturnValue({ title: "", author: "", subject: "", keywords: "" }),
      getEditorState: vi.fn().mockReturnValue({ activePage: 1, selectedIds: [], activeId: null, zoomLevel: 1, pan: { x: 0, y: 0 } }),
    };
    saveManager.setCallbacks(mockCallbacks);
  });

  it("should start in unsaved state", () => {
    const info = saveManager.getSaveInfo();
    expect(info.state).toBe("unsaved");
    expect(info.dirty).toBe(false);
    expect(info.filePath).toBeNull();
  });

  it("should track dirty state", () => {
    expect(saveManager.isDirty).toBe(false);
    saveManager.markDirty();
    expect(saveManager.isDirty).toBe(true);
  });

  it("should transition through save states", async () => {
    saveManager.setFilePath("/path/to/doc.pdf");
    const error = await saveManager.save(new Uint8Array([1, 2, 3]));

    expect(error).toBeNull();
    expect(saveManager.state).toBe("saved");
    expect(saveManager.isDirty).toBe(false);
  });

  it("should reject save without file path", async () => {
    const error = await saveManager.save(new Uint8Array([1, 2, 3]));
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No file path");
  });

  it("should reject save without callbacks", async () => {
    const noCallbacks = new SaveManager();
    noCallbacks.setFilePath("/path/doc.pdf");
    const error = await noCallbacks.save(new Uint8Array([1, 2, 3]));
    expect(error).not.toBeNull();
  });

  it("should prevent concurrent saves", async () => {
    saveManager.setFilePath("/path/doc.pdf");

    // Make writeFile hang to simulate concurrent save
    let resolveWrite: () => void;
    mockCallbacks.writeFile = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveWrite = resolve;
      });
    });

    // Start first save
    const savePromise = saveManager.save(new Uint8Array([1, 2, 3]));

    // Second save should be rejected
    const secondError = await saveManager.save(new Uint8Array([4, 5, 6]));
    expect(secondError).not.toBeNull();
    expect(secondError!.message).toContain("already in progress");

    // Resolve first save
    resolveWrite!();
    const firstError = await savePromise;
    expect(firstError).toBeNull();
  });

  it("should update file path on saveAs", async () => {
    const error = await saveManager.saveAs("/new/path/doc.pdf", new Uint8Array([1, 2, 3]));
    expect(error).toBeNull();
    expect(saveManager.filePath).toBe("/new/path/doc.pdf");
  });

  it("should report errors on write failure", async () => {
    saveManager.setFilePath("/path/doc.pdf");
    mockCallbacks.writeFile = vi.fn().mockRejectedValue(new Error("Disk full"));

    const error = await saveManager.save(new Uint8Array([1, 2, 3]));
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Disk full");
    expect(saveManager.state).toBe("error");
  });
});

// ── MetadataWriter Tests ───────────────────────────────────────────
import { MetadataWriter } from "../MetadataWriter";

describe("MetadataWriter", () => {
  // Mock PDFDocument since it's created by pdf-lib
  const mockPdfDoc = () => ({
    getTitle: () => "Original Title",
    getAuthor: () => "Original Author",
    getSubject: () => "Original Subject",
    getKeywords: () => "original, keywords",
    getProducer: () => "Original Producer",
    getCreator: () => "Original Creator",
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setSubject: vi.fn(),
    setKeywords: vi.fn(),
    setProducer: vi.fn(),
    setCreator: vi.fn(),
    setModificationDate: vi.fn(),
    setCreationDate: vi.fn(),
  });

  it("should read metadata from document", () => {
    const writer = new MetadataWriter();
    const doc = mockPdfDoc() as any;
    const metadata = writer.readFromDocument(doc);
    expect(metadata.title).toBe("Original Title");
    expect(metadata.author).toBe("Original Author");
  });

  it("should write metadata to document", () => {
    const writer = new MetadataWriter();
    const doc = mockPdfDoc() as any;
    writer.writeToDocument(doc, { title: "New Title", author: "New Author" });
    expect(doc.setTitle).toHaveBeenCalledWith("New Title");
    expect(doc.setAuthor).toHaveBeenCalledWith("New Author");
  });

  it("should preserve and override metadata", () => {
    const writer = new MetadataWriter();
    const source = mockPdfDoc() as any;
    const target = mockPdfDoc() as any;
    writer.preserveAndOverride(source, target, { title: "Overridden Title" });
    // Title should be overridden
    expect(target.setTitle).toHaveBeenCalledWith("Overridden Title");
    // Author should be preserved from source
    expect(target.setAuthor).toHaveBeenCalledWith("Original Author");
  });
});
