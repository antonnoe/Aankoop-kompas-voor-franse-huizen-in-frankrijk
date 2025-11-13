// /api/dvf.js
// OFFICIËLE DVF+ CEREMA API — Gemeente-level GeoJSON
// Berekening m²-prijs voor woningen (maison), laatste 3 jaar.
// Compatibel met Vercel Serverless + jouw Aankoopkompas React-app.

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use GET." });
    }

    const { insee } = req.query;
    if (!insee || String(insee).trim().length < 5) {
      return res.status(400).json({ ok: false, error: "Geef parameter ?insee=XXXXX" });
    }

    const inseeStr = String(insee).trim();
    const url = `https://files.data.gouv.fr/geo-dvf/latest/communes/${inseeStr}.json`;

    // Stap 1 — GeoJSON ophalen
    const geoResp = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!geoResp.ok) {
      return res.status(404).json({
        ok: false,
        error: "Geen DVF+ data voor deze gemeente.",
        insee
      });
    }

    const geo = await geoResp.json();
    const items = Array.isArray(geo?.features) ? geo.features : [];

    // Stap 2 — Basisfilters
    const now = new Date();
    const cutoffYear = now.getFullYear() - 3;

    const filtered = items.filter(f => {
      const p = f.properties || {};
      return (
        p.nature_mutation === "Vente" &&
        p.type_local === "Maison" &&
        Number(p.surface_reelle_bati) > 25 &&
        Number(p.valeur_fonciere) > 1000 &&
        parseInt((p.date_mutation || "").slice(0, 4)) >= cutoffYear
      );
    });

    if (filtered.length === 0) {
      return res.status(200).json({
        ok: true,
        insee: inseeStr,
        metrics: null,
        note: "Geen relevante transacties gevonden (maison/vente laatste 3 jaar)."
      });
    }

    // Stap 3 — m² berekening
    const m2values = filtered
      .map(f => {
        const p = f.properties;
        return p.valeur_fonciere / p.surface_reelle_bati;
      })
      .filter(x => x > 0 && x < 10000); // sanity filter

    const avg = Math.round(m2values.reduce((a, b) => a + b, 0) / m2values.length);
    const median = Math.round(medianCalc(m2values));
    const min = Math.round(Math.min(...m2values));
    const max = Math.round(Math.max(...m2values));

    const result = {
      ok: true,
      insee: inseeStr,
      metrics: {
        avg_m2: avg,
        median_m2: median,
        min_m2: min,
        max_m2: max,
        count: m2values.length
      },
      links: {
        source: url
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(result);

  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e).slice(0, 300)
    });
  }
}

function medianCalc(arr) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
