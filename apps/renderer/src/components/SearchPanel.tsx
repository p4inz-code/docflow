/**
 * SearchPanel.tsx — Document Search Panel
 *
 * Purpose: Provide professional document search functionality.
 * Searches existing PDF text content and displays results with
 * match highlighting and navigation.
 *
 * Features:
 *   - Search PDF text content
 *   - Case sensitivity toggle
 *   - Whole word toggle
 *   - Match count
 *   - Next / Previous navigation
 *   - Scroll to result
 *   - Result highlighting
 *   - Collapsible panel
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface SearchPanelProps {
  pdf: PDFDocumentProxy;
  isOpen: boolean;
  onToggle: () => void;
}

interface SearchResult {
  pageIndex: number;
  text: string;
  matchIndex: number;
}

export default function SearchPanel({ pdf, isOpen, onToggle }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [pageTexts, setPageTexts] = useState<Map<number, string>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract text from all pages in batches to avoid blocking the UI
  const [isLoadingText, setIsLoadingText] = useState(false);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const texts = new Map<number, string>();
      const totalPages = pdf.numPages;
      setIsLoadingText(true);

      // Process pages in batches of 10
      const BATCH_SIZE = 10;
      for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
        if (cancelled) break;
        const end = Math.min(start + BATCH_SIZE - 1, totalPages);

        const batchPromises = [];
        for (let i = start; i <= end; i++) {
          batchPromises.push(
            (async () => {
              try {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const text = content.items
                  .map((item) => ("str" in item ? String((item as { str: string }).str) : ""))
                  .join(" ");
                texts.set(i, text);
              } catch {
                texts.set(i, "");
              }
            })(),
          );
        }

        await Promise.all(batchPromises);

        // Yield to UI thread between batches
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (!cancelled) {
          // Update progressively so search can start before all pages are loaded
          setPageTexts(new Map(texts));
        }
      }

      if (!cancelled) {
        setIsLoadingText(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentResult(0);
      return;
    }

    setIsSearching(true);

    // Use setTimeout to avoid blocking UI
    const timer = setTimeout(() => {
      const found: SearchResult[] = [];
      let queryStr = caseSensitive ? query : query.toLowerCase();

      for (const [pageIndex, text] of pageTexts) {
        let searchText = caseSensitive ? text : text.toLowerCase();
        let startIndex = 0;
        let matchCount = 0;

        while (startIndex < searchText.length) {
          const idx = searchText.indexOf(queryStr, startIndex);
          if (idx === -1) break;

          // Whole word check
          if (wholeWord) {
            const before = idx > 0 ? searchText[idx - 1] : " ";
            const after = idx + queryStr.length < searchText.length
              ? searchText[idx + queryStr.length]
              : " ";
            const isWordBoundary = (c: string) =>
              !c.match(/[\w\u00C0-\u024F]/);
            if (!isWordBoundary(before) || !isWordBoundary(after)) {
              startIndex = idx + 1;
              continue;
            }
          }

          matchCount++;
          found.push({ pageIndex, text, matchIndex: matchCount });
          startIndex = idx + queryStr.length;
        }
      }

      setResults(found);
      setCurrentResult(found.length > 0 ? 1 : 0);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, caseSensitive, wholeWord, pageTexts]);

  // Navigate to result
  const goToResult = useCallback(
    (index: number) => {
      if (results.length === 0) return;
      const idx = Math.max(1, Math.min(index, results.length));
      setCurrentResult(idx);

      const result = results[idx - 1];
      if (result) {
        const el = document.querySelector(
          `[data-page-index="${result.pageIndex}"]`,
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [results],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goToResult(currentResult - 1);
        } else {
          goToResult(currentResult + 1);
        }
      }
      if (e.key === "Escape") {
        onToggle();
      }
    },
    [currentResult, goToResult, onToggle],
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          top: 50,
          right: 270,
          zIndex: 100,
          background: "#1e1e1e",
          border: "1px solid #333",
          borderRadius: 4,
          color: "#888",
          cursor: "pointer",
          padding: "4px 8px",
          fontSize: 12,
        }}
        title="Search (Ctrl+F)"
      >
        🔍
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Search document"
      aria-modal="true"
      style={{
        position: "absolute",
        top: 50,
        right: 270,
        zIndex: 100,
        width: 280,
        background: "#1e1e1e",
        border: "1px solid #333",
        borderRadius: 6,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      {/* Search input */}
      <div style={{ padding: "8px", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search document..."
            autoFocus
            aria-label="Search query"
            style={{
              flex: 1,
              padding: "5px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#252525",
              color: "#ccc",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={onToggle}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: caseSensitive ? "#4a9eff" : "#777",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            Aa
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: wholeWord ? "#4a9eff" : "#777",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              style={{ accentColor: "#4a9eff" }}
            />
            Word
          </label>

          <div style={{ flex: 1 }} />

          {/* Result count */}
          <span style={{ color: "#666", fontSize: 11 }}>
            {isSearching
              ? "Searching..."
              : isLoadingText
                ? "Loading text..."
                : query
                  ? `${currentResult}/${results.length}`
                  : ""}
          </span>
        </div>
      </div>

      {/* Navigation */}
      {results.length > 0 && (
        <div
          style={{
            display: "flex",
            padding: "4px 8px",
            borderBottom: "1px solid #2a2a2a",
            gap: 4,
          }}
        >
          <button
            onClick={() => goToResult(currentResult - 1)}
            disabled={currentResult <= 1}
            style={{
              flex: 1,
              padding: "3px 0",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#252525",
              color: currentResult > 1 ? "#ccc" : "#555",
              cursor: currentResult > 1 ? "pointer" : "default",
              fontSize: 11,
            }}
          >
            ▲ Prev
          </button>
          <button
            onClick={() => goToResult(currentResult + 1)}
            disabled={currentResult >= results.length}
            style={{
              flex: 1,
              padding: "3px 0",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#252525",
              color: currentResult < results.length ? "#ccc" : "#555",
              cursor: currentResult < results.length ? "pointer" : "default",
              fontSize: 11,
            }}
          >
            ▼ Next
          </button>
        </div>
      )}

      {/* Results list */}
      {query && results.length === 0 && !isSearching && (
        <div style={{ padding: "12px", color: "#666", fontSize: 12, textAlign: "center" }}>
          No results found
        </div>
      )}

      {results.length > 0 && (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {results.slice(0, 50).map((result, i) => (
            <div
              key={`${result.pageIndex}-${result.matchIndex}`}
              onClick={() => goToResult(i + 1)}
              style={{
                padding: "5px 8px",
                cursor: "pointer",
                background: i + 1 === currentResult ? "#2a3a4a" : "transparent",
                color: i + 1 === currentResult ? "#fff" : "#aaa",
                fontSize: 12,
                borderBottom: "1px solid #252525",
                display: "flex",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                if (i + 1 !== currentResult) {
                  (e.target as HTMLElement).style.background = "#252525";
                }
              }}
              onMouseLeave={(e) => {
                if (i + 1 !== currentResult) {
                  (e.target as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <span style={{ color: "#555", flexShrink: 0 }}>
                p.{result.pageIndex}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.text.substring(0, 80)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
