// ponytail: skeleton SSR revalidate 60, storage via lib/storage, tokeny CSS only
import { getLastCheck, getLastHash, getHistory } from "@/lib/storage";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function Home() {
  const [lastCheck, lastHash, history] = await Promise.all([
    getLastCheck(),
    getLastHash(),
    getHistory(),
  ]);

  const hashPrefix = lastHash ? lastHash.slice(0, 8) : null;
  const lastCheckDisplay = lastCheck ? new Date(lastCheck).toISOString().replace("T", " ").slice(0, 16) + " UTC" : null;

  return (
    <div
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
      }}
    >
      <main
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "var(--space-xl) var(--space-lg)",
        }}
      >
        <header style={{ marginBottom: "var(--space-xl)" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "var(--space-xs)" }}>
            Rovos Monitor
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            Monitoring https://rovos.com/journeys/specials/
          </p>
        </header>

        <div style={{ display: "grid", gap: "var(--space-lg)", gridTemplateColumns: "1fr" }}>
          <section
            data-testid="status-card"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-lg)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "var(--space-md)" }}>
              Status
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", fontSize: "14px" }}>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Ostatnie sprawdzenie: </span>
                <span data-testid="last-check">
                  {lastCheckDisplay ?? "Brak danych - pierwsze sprawdzenie w toku"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Hash: </span>
                <span data-testid="status-hash" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                  {hashPrefix ?? "Brak danych"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Historia wpisow: </span>
                <span>{history.length}</span>
              </div>
            </div>
          </section>

          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-lg)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "var(--space-md)" }}>
              Historia
            </h2>
            {history.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
                Brak danych - pierwsze sprawdzenie w toku. Cron uruchomi sie za mniej niz 60 min.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {history.map((entry) => (
                  <li
                    key={entry.timestamp + entry.hash}
                    data-testid="history-item"
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "13px",
                    }}
                  >
                    <span>{new Date(entry.timestamp).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                    <span style={{ marginLeft: "var(--space-sm)", fontFamily: "var(--font-mono)" }}>
                      {entry.hash.slice(0, 8)}
                    </span>
                    <span style={{ marginLeft: "var(--space-sm)", color: entry.changed ? "var(--color-success)" : "var(--color-text-muted)" }}>
                      {entry.changed ? "zmiana" : "brak zmian"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
