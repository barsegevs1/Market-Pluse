import type { VercelRequest, VercelResponse } from '@vercel/node';

const RANGE_MAP: Record<string, { interval: string; range: string }> = {
  '1D':  { interval: '5m',  range: '1d'  },
  '1M':  { interval: '1d',  range: '1mo' },
  'YTD': { interval: '1d',  range: 'ytd' },
  '1Y':  { interval: '1d',  range: '1y'  },
  '5Y':  { interval: '1wk', range: '5y'  },
};

const FALLBACK: Record<string, string> = {
  '^GSPC': 'SPY', '^IXIC': 'QQQ', '^TA35.TA': 'EIS',
  '^STOXX50E': 'FEZ', '^N225': 'EWJ', 'EEM': 'EEM', 'URTH': 'URTH'
};

async function fetchSymbol(symbol: string, interval: string, range: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp?.length) throw new Error('No data');
  return result;
}

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
      const result = await fetchSymbol(symbol, interval, r);
      results[symbol] = { result };
    } catch {
      // fallback
      const fallback = FALLBACK[symbol];
      if (fallback && fallback !== symbol) {
        try {
          const result = await fetchSymbol(fallback, interval, r);
          results[symbol] = { result, usedFallback: fallback };
        } catch (e) {
          results[symbol] = { error: String(e) };
        }
      } else {
        results[symbol] = { error: 'Failed' };
      }
    }
  }));

  return res.status(200).json({ range, data: results });
}
