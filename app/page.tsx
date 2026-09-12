import { getLastCheck, getLastHash, getHistory } from "@/lib/storage";
import HistoryList from "./components/HistoryList";
import ManualCheckButton from "./components/ManualCheckButton";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ checked?: string; changed?: string; hash?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [lastCheck, lastHash, history] = await Promise.all([
    getLastCheck(),
    getLastHash(),
    getHistory(),
  ]);

  const hashPrefix = lastHash ? lastHash.slice(0, 8) : "-";
  const lastCheckDisplay = lastCheck ? new Date(lastCheck).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "Brak danych";
  const nextCheckDisplay = lastCheck
    ? new Date(new Date(lastCheck).getTime() + 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "za <60 min";

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
          <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "var(--space-xs)" }}>Rovos Monitor</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Monitoring https://rovos.com/journeys/specials/</p>
        </header>

        <div className="dashboard-grid">
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
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "var(--space-md)" }}>Status</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", fontSize: "14px" }}>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Ostatnie sprawdzenie: </span>
                <span data-testid="last-check">{lastCheckDisplay}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Hash: </span>
                <span data-testid="status-hash" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                  {hashPrefix}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Nastepne sprawdzenie: </span>
                <span data-testid="next-check">{nextCheckDisplay}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Historia wpisow: </span>
                <span data-testid="history-count">{history.length}</span>
              </div>
              <div style={{ marginTop: "var(--space-md)" }}>
                <ManualCheckButton />
                {params?.checked === "1" && (
                  <div
                    role="status"
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
                    {params.error
                      ? params.error === "rate-limited"
                        ? "rate-limited"
                        : `Sprawdzono: ${params.error}`
                      : params.changed !== undefined
                        ? `Sprawdzono: changed ${params.changed}`
                        : "Sprawdzono"}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            data-testid="history-section"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-lg)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "var(--space-md)" }}>Historia</h2>
            <HistoryList history={history} />
          </section>
        </div>
      </main>
    </div>
  );
}
