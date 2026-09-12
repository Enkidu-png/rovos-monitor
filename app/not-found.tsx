import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-xl)",
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          boxShadow: "var(--shadow-sm)",
          textAlign: "center",
          maxWidth: "480px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Strona nie znaleziona</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "var(--space-lg)" }}>
          Przepraszamy, strona ktorej szukasz nie istnieje.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "var(--color-accent)",
            color: "white",
            padding: "8px 20px",
            borderRadius: "var(--radius-md)",
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Wroc na strone glowna
        </Link>
      </div>
    </div>
  );
}
