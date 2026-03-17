module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const results = {};
    let usdToIdr = 16200;
    try {
      const fxRes = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
      const fxData = await fxRes.json();
      usdToIdr = fxData.rates?.IDR || 16200;
    } catch(e) {}
    results.exchange_rate = { usd_idr: usdToIdr };

    const symbols = {
      live_cattle:'GF=F', lean_hogs:'HE=F', corn:'ZC=F',
      soybeans:'ZS=F', coffee:'KC=F', rubber:'TOCOM=F'
    };
    for (const [key, symbol] of Object.entries(symbols)) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const d = await r.json();
        const meta = d.chart?.result?.[0]?.meta;
        if (meta) {
          const priceUSD = meta.regularMarketPrice;
          const prev = meta.previousClose || meta.chartPreviousClose;
          const change = prev ? ((priceUSD - prev) / prev * 100) : 0;
          let priceIDR = priceUSD * usdToIdr;
          if (key === 'live_cattle' || key === 'lean_hogs') {
            priceIDR = (priceUSD / 100) * usdToIdr / 0.453592;
          } else if (key === 'corn') {
            priceIDR = (priceUSD / 100) * usdToIdr / (56 * 0.453592);
          } else if (key === 'soybeans') {
            priceIDR = (priceUSD / 100) * usdToIdr / (60 * 0.453592);
          } else if (key === 'coffee') {
            priceIDR = (priceUSD / 100) * usdToIdr / 0.453592;
          }
          results[key] = {
            price_usd: priceUSD,
            price_idr: Math.round(priceIDR),
            change_pct: parseFloat(change.toFixed(2)),
            updated: new Date(meta.regularMarketTime * 1000).toISOString()
          };
        }
      } catch(e) { results[key] = { error: e.message }; }
    }

    // Try Panel Harga Kementan for local prices
    try {
      const r = await fetch('https://panelharga.kementan.go.id/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TernakOS/1.0)' }
      });
      if (r.ok) {
        const html = await r.text();
        const ep = (pat) => { const m = html.match(pat); return m ? parseInt(m[1].replace(/[.,]/g,'')) : null; };
        results.local_kementan = {
          cabai_merah: ep(/Cabai Merah[^]*?Rp\s*([\d.,]+)/i),
          cabai_rawit: ep(/Cabai Rawit[^]*?Rp\s*([\d.,]+)/i),
          bawang_merah: ep(/Bawang Merah[^]*?Rp\s*([\d.,]+)/i),
          ayam_broiler: ep(/Ayam[^]*?Rp\s*([\d.,]+)/i),
          telur_ayam: ep(/Telur[^]*?Rp\s*([\d.,]+)/i),
          updated: new Date().toISOString()
        };
      }
    } catch(e) { results.local_kementan = { error: 'unavailable' }; }

    results.timestamp = new Date().toISOString();
    res.status(200).json(results);
  } catch(error) { res.status(500).json({ error: error.message }); }
};
