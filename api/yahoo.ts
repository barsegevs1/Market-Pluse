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
  '^STOXX50E': 'FEZ', '^N225': 'EWJ'
};

async function fetchChart(symbol: string, interval: string, range: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp?.length) throw new Error('No data');
  return result;
}

async function fetchQuote(symbol: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.quoteResponse?.result?.[0] || null;
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
      let chartResult;
      try {
        chartResult = await fetchChart(symbol, interval, r);
      } catch {
        const fb = FALLBACK[symbol];
        if (!fb) throw new Error('No data and no fallback');
        chartResult = await fetchChart(fb, interval, r);
      }

      // הבא market cap, P/E, שם מלא, סקטור
      const quote = await fetchQuote(symbol);
      if (quote) {
        if (!chartResult.meta) chartResult.meta = {};
        chartResult.meta.marketCap   = quote.marketCap || 0;
        chartResult.meta.trailingPE  = quote.trailingPE || 0;
        chartResult.meta.forwardPE   = quote.forwardPE || 0;
        chartResult.meta.longName    = quote.longName || quote.shortName || symbol;
        chartResult.meta.currency    = quote.currency || chartResult.meta.currency || 'USD';
        // תיקון: מניות TASE נסחרות באגורות (Agorot) — 100 אגורות = 1 שקל
        if (quote.currency === 'ILA') {
          chartResult.meta.regularMarketPrice = (chartResult.meta.regularMarketPrice || 0) / 100;
          chartResult.meta.chartPreviousClose = (chartResult.meta.chartPreviousClose || 0) / 100;
          chartResult.meta.fiftyTwoWeekHigh   = (chartResult.meta.fiftyTwoWeekHigh || 0) / 100;
          chartResult.meta.currency = 'ILS';
        }
      }

      results[symbol] = { result: chartResult };
    } catch (e) {
      results[symbol] = { error: String(e) };
    }
  }));

  return res.status(200).json({ range, data: results });
}
