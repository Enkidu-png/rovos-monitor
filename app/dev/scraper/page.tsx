import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DevScraperPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scraper Playground</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Dev only - test scraper without cron</p>
      <form id="scraper-form" className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span>URL</span>
          <input
            name="url"
            defaultValue="https://rovos.com/journeys/specials/"
            className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-2"
            placeholder="https://rovos.com/journeys/specials/"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Selector</span>
          <input
            name="selector"
            defaultValue="main"
            className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-2"
            placeholder="main"
          />
        </label>
        <button
          type="submit"
          className="bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] px-4 py-2"
        >
          Fetch
        </button>
      </form>
      <div id="result" className="mt-6 p-4 border border-[var(--color-border)] rounded-[var(--radius-md)] hidden">
        <p>Hash: <code id="hash" className="font-mono break-all"></code></p>
        <p>Duration: <span id="duration"></span> ms</p>
        <p>Used fallback: <span id="fallback"></span></p>
        <p>Snippet: <span id="snippet"></span></p>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('scraper-form')?.addEventListener('submit', async (e) => {
              e.preventDefault();
              const form = e.target;
              const url = form.url.value;
              const selector = form.selector.value;
              const btn = form.querySelector('button');
              btn.disabled = true;
              btn.textContent = 'Loading...';
              try {
                const res = await fetch('/api/check', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url, selector }) });
                const data = await res.json();
                document.getElementById('hash').textContent = data.hash || '';
                document.getElementById('duration').textContent = data.durationMs || '';
                document.getElementById('fallback').textContent = data.usedFallback || false;
                document.getElementById('snippet').textContent = (data.snippet || '').slice(0,500);
                document.getElementById('result').classList.remove('hidden');
              } catch (err) {
                document.getElementById('hash').textContent = 'error: ' + err;
                document.getElementById('result').classList.remove('hidden');
              } finally {
                btn.disabled = false;
                btn.textContent = 'Fetch';
              }
            });
          `,
        }}
      />
    </main>
  );
}
