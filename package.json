import type { VercelRequest, VercelResponse } from '@vercel/node';

const RANGE_MAP: Record<string, { interval: string; range: string }> = {
  '1D':  { interval: '5m',  range: '1d'  },
  '1M':  { interval: '1d',  range: '1mo' },
  'YTD': { interval: '1d',  range: 'ytd' },
  '1Y':  { interval: '1d',  range: '1y'  },
  '5Y':  { interval: '1wk', range: '5y'  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const symbols = String(req.query.symbols || '').split(',').filter(Boolean);
  const range   = String(req.query.range || '1M');
  const { interval, range: r } = RANGE_MAP[range] || RANGE_MAP['1M'];

  if (!symbols.length) return res.status(400).json({ error: 'No symbols' });

  const results: Record<string, unknown> = {};

  await Promise.all(symbols.map(async symbol => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      results[symbol] = { result: data?.chart?.result?.[0] || null };
    } catch (e) {
      results[symbol] = { error: String(e) };
    }
  }));

  return res.status(200).json({ range, data: results });
}
