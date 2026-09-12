"use client";
import { useState } from "react";
type Entry = {
  timestamp: string;
  hash: string;
  changed: boolean;
  error?: string;
  durationMs: number;
  snippet?: string;
};

export default function HistoryList({ history }: { history: Entry[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
        Brak danych - pierwsze sprawdzenie w toku. Cron uruchomi sie za mniej niz 60 min.
      </p>
    );
  }

  const copyHash = async (hash: string, idx: number) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hash);
      } else {
        window.prompt("Skopiuj hash", hash);
        return;
      }
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Skopiuj hash", hash);
    }
  };

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "60vh", overflowY: "auto" }}>
      {history.map((entry, idx) => {
        const isOpen = expanded === idx;
        return (
          <li
            key={entry.timestamp + entry.hash + idx}
            data-testid="history-item"
            className="history-item"
            style={{ padding: 0 }}
            onClick={() => setExpanded(isOpen ? null : idx)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(isOpen ? null : idx);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                flexWrap: "wrap",
                font: "inherit",
                color: "inherit",
              }}
            >
              <span>{new Date(entry.timestamp).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{entry.hash.slice(0, 8)}</span>
              <span
                style={{
                  background: entry.changed ? "var(--color-success)" : "var(--color-border)",
                  color: entry.changed ? "var(--color-surface)" : "var(--color-text)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 8px",
                  fontSize: "11px",
                }}
              >
                {entry.changed ? "zmiana" : "brak zmian"}
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  marginTop: "var(--space-sm)",
                  padding: "var(--space-sm)",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                {entry.snippet && (
                  <div data-testid="snippet" style={{ fontSize: "12px", wordBreak: "break-all" }}>
                    {entry.snippet.slice(0, 500)}
                  </div>
                )}
                {entry.error && (
                  <div style={{ fontSize: "12px", color: "var(--color-error)" }}>{entry.error}</div>
                )}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", wordBreak: "break-all" }}>
                  {entry.hash}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{entry.durationMs} ms</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyHash(entry.hash, idx);
                  }}
                  style={{
                    alignSelf: "flex-start",
                    background: "var(--color-accent)",
                    color: "var(--color-surface)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 10px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {copied === idx ? "Skopiowano" : "Kopiuj hash"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
