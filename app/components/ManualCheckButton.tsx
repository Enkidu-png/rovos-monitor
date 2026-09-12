/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect } from "react";

export default function ManualCheckButton() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checked") === "1") {
      const changed = params.get("changed");
      if (changed !== null) {
        setToast(`Sprawdzono: changed ${changed}`);
      } else {
        setToast("Sprawdzono");
      }
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/check", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setToast("rate-limited");
      } else if (data.changed !== undefined) {
        setToast(`Sprawdzono: changed ${String(data.changed)}`);
      } else if (data.error) {
        setToast(data.error === "rate-limited, try in 30s" ? "rate-limited" : `Sprawdzono: ${data.error}`);
      } else {
        setToast("Sprawdzono");
      }
    } catch {
      setToast("Sprawdzono: error");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div>
      <form method="POST" action="/api/check" data-testid="manual-form" onSubmit={handleClick}>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: "40px",
            padding: "0 20px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent)",
            color: "var(--color-surface)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            fontSize: "14px",
            fontWeight: 600,
            transition: "background var(--transition-fast), opacity var(--transition-fast)",
          }}
          onMouseEnter={(ev) => {
            if (!loading) (ev.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-hover)";
          }}
          onMouseLeave={(ev) => {
            (ev.currentTarget as HTMLButtonElement).style.background = "var(--color-accent)";
          }}
        >
          {loading && <span className="spinner" aria-hidden="true" />}
          Sprawdz teraz
        </button>
      </form>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: "var(--space-sm)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            fontSize: "13px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
