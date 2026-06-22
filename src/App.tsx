import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

// ── טיפוסים ──────────────────────────────────────────────────
interface StockRow {
  ticker: string
  name: string
  sector: string
  index: string
  marketCap: number
  pe: number
  price: number
  change1d: number
  change5d: number
  change21d: number
  high52w: number
  dropFromHigh: number
  delta1d: number
  delta5d: number
  delta21d: number
  score: number
}

interface ChartPoint { date: string; [key: string]: number | string }

// ── קבועים ───────────────────────────────────────────────────
const INDICES = [
  { key: 'SP500',    symbol: '^GSPC',     label: 'S&P 500',      color: '#4ade80' },
  { key: 'NASDAQ',   symbol: '^IXIC',     label: 'NASDAQ',       color: '#60a5fa' },
  { key: 'TA35',     symbol: '^TA35.TA',  label: 'TA-35',        color: '#f59e0b' },
  { key: 'STOXX',    symbol: '^STOXX50E', label: 'Euro Stoxx 50',color: '#a78bfa' },
  { key: 'NIKKEI',   symbol: '^N225',     label: 'Nikkei 225',   color: '#f87171' },
  { key: 'MSCI_EM',  symbol: 'EEM',       label: 'MSCI EM',      color: '#34d399' },
  { key: 'MSCI_W',   symbol: 'URTH',      label: 'MSCI World',   color: '#fb923c' },
]

const RANGES = ['1D','1M','YTD','1Y','5Y']

const TICKERS: { ticker: string; name: string; sector: string; index: string }[] = [
  // NASDAQ 100
  {ticker:'AAPL',  name:'Apple Inc.',         sector:'Technology',      index:'NASDAQ'},
  {ticker:'MSFT',  name:'Microsoft Corp.',    sector:'Technology',      index:'NASDAQ'},
  {ticker:'NVDA',  name:'NVIDIA Corp.',       sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'AMZN',  name:'Amazon.com Inc.',    sector:'Consumer Disc.',  index:'NASDAQ'},
  {ticker:'META',  name:'Meta Platforms',     sector:'Communication',   index:'NASDAQ'},
  {ticker:'GOOGL', name:'Alphabet Inc.',      sector:'Communication',   index:'NASDAQ'},
  {ticker:'TSLA',  name:'Tesla Inc.',         sector:'Consumer Disc.',  index:'NASDAQ'},
  {ticker:'AVGO',  name:'Broadcom Inc.',      sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'COST',  name:'Costco Wholesale',   sector:'Consumer Staples',index:'NASDAQ'},
  {ticker:'NFLX',  name:'Netflix Inc.',       sector:'Communication',   index:'NASDAQ'},
  {ticker:'AMD',   name:'AMD',                sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'ADBE',  name:'Adobe Inc.',         sector:'Technology',      index:'NASDAQ'},
  {ticker:'QCOM',  name:'Qualcomm',           sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'INTC',  name:'Intel Corp.',        sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'CSCO',  name:'Cisco Systems',      sector:'Technology',      index:'NASDAQ'},
  {ticker:'TXN',   name:'Texas Instruments',  sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'AMGN',  name:'Amgen Inc.',         sector:'Healthcare',      index:'NASDAQ'},
  {ticker:'INTU',  name:'Intuit Inc.',        sector:'Technology',      index:'NASDAQ'},
  {ticker:'CMCSA', name:'Comcast Corp.',      sector:'Communication',   index:'NASDAQ'},
  {ticker:'PEP',   name:'PepsiCo Inc.',       sector:'Consumer Staples',index:'NASDAQ'},
  {ticker:'TMUS',  name:'T-Mobile US',        sector:'Communication',   index:'NASDAQ'},
  {ticker:'AMAT',  name:'Applied Materials',  sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'MU',    name:'Micron Technology',  sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'LRCX',  name:'Lam Research',       sector:'Semiconductors',  index:'NASDAQ'},
  {ticker:'PANW',  name:'Palo Alto Networks', sector:'Technology',      index:'NASDAQ'},
  {ticker:'CRWD',  name:'CrowdStrike',        sector:'Technology',      index:'NASDAQ'},
  {ticker:'MELI',  name:'MercadoLibre',       sector:'Consumer Disc.',  index:'NASDAQ'},
  {ticker:'ADP',   name:'ADP',                sector:'Technology',      index:'NASDAQ'},
  {ticker:'REGN',  name:'Regeneron Pharma',   sector:'Healthcare',      index:'NASDAQ'},
  {ticker:'GILD',  name:'Gilead Sciences',    sector:'Healthcare',      index:'NASDAQ'},
  // S&P 500
  {ticker:'JPM',   name:'JPMorgan Chase',     sector:'Financials',      index:'NYSE'},
  {ticker:'V',     name:'Visa Inc.',          sector:'Financials',      index:'NYSE'},
  {ticker:'MA',    name:'Mastercard',         sector:'Financials',      index:'NYSE'},
  {ticker:'UNH',   name:'UnitedHealth Group', sector:'Healthcare',      index:'NYSE'},
  {ticker:'XOM',   name:'Exxon Mobil',        sector:'Energy',          index:'NYSE'},
  {ticker:'JNJ',   name:'Johnson & Johnson',  sector:'Healthcare',      index:'NYSE'},
  {ticker:'WMT',   name:'Walmart Inc.',       sector:'Consumer Staples',index:'NYSE'},
  {ticker:'PG',    name:'Procter & Gamble',   sector:'Consumer Staples',index:'NYSE'},
  {ticker:'HD',    name:'Home Depot',         sector:'Consumer Disc.',  index:'NYSE'},
  {ticker:'CVX',   name:'Chevron Corp.',      sector:'Energy',          index:'NYSE'},
  {ticker:'MRK',   name:'Merck & Co.',        sector:'Healthcare',      index:'NYSE'},
  {ticker:'LLY',   name:'Eli Lilly',          sector:'Healthcare',      index:'NYSE'},
  {ticker:'ABBV',  name:'AbbVie Inc.',        sector:'Healthcare',      index:'NYSE'},
  {ticker:'BAC',   name:'Bank of America',    sector:'Financials',      index:'NYSE'},
  {ticker:'KO',    name:'Coca-Cola Co.',      sector:'Consumer Staples',index:'NYSE'},
  {ticker:'PFE',   name:'Pfizer Inc.',        sector:'Healthcare',      index:'NYSE'},
  {ticker:'MCD',   name:'McDonald\'s Corp.',  sector:'Consumer Disc.',  index:'NYSE'},
  {ticker:'ACN',   name:'Accenture',          sector:'Technology',      index:'NYSE'},
  {ticker:'NEE',   name:'NextEra Energy',     sector:'Utilities',       index:'NYSE'},
  {ticker:'NKE',   name:'Nike Inc.',          sector:'Consumer Disc.',  index:'NYSE'},
  {ticker:'BA',    name:'Boeing Co.',         sector:'Industrials',     index:'NYSE'},
  {ticker:'LMT',   name:'Lockheed Martin',    sector:'Industrials',     index:'NYSE'},
  {ticker:'GS',    name:'Goldman Sachs',      sector:'Financials',      index:'NYSE'},
  {ticker:'MS',    name:'Morgan Stanley',     sector:'Financials',      index:'NYSE'},
  {ticker:'CAT',   name:'Caterpillar Inc.',   sector:'Industrials',     index:'NYSE'},
  {ticker:'DE',    name:'Deere & Company',    sector:'Industrials',     index:'NYSE'},
  {ticker:'UPS',   name:'UPS',                sector:'Industrials',     index:'NYSE'},
  {ticker:'RTX',   name:'RTX Corp.',          sector:'Industrials',     index:'NYSE'},
  {ticker:'BMY',   name:'Bristol-Myers',      sector:'Healthcare',      index:'NYSE'},
  {ticker:'TMO',   name:'Thermo Fisher',      sector:'Healthcare',      index:'NYSE'},
  // TA-35
  {ticker:'TEVA.TA', name:'Teva Pharma',      sector:'Healthcare',      index:'TASE'},
  {ticker:'NICE.TA', name:'NICE Ltd.',        sector:'Technology',      index:'TASE'},
  {ticker:'CHKP.TA', name:'Check Point',      sector:'Technology',      index:'TASE'},
  {ticker:'ESLT.TA', name:'Elbit Systems',    sector:'Industrials',     index:'TASE'},
  {ticker:'ICL.TA',  name:'ICL Group',        sector:'Materials',       index:'TASE'},
  {ticker:'PHOE.TA', name:'Phoenix Holdings', sector:'Financials',      index:'TASE'},
  {ticker:'LUMI.TA', name:'Bank Leumi',       sector:'Financials',      index:'TASE'},
  {ticker:'HARL.TA', name:'Bank Hapoalim',    sector:'Financials',      index:'TASE'},
  {ticker:'BONY.TA', name:'Bank of Jerusalem',sector:'Financials',      index:'TASE'},
  {ticker:'DSCT.TA', name:'Bank Discount',    sector:'Financials',      index:'TASE'},
]

// ── עזר ──────────────────────────────────────────────────────
const fmt = (n: number, decimals = 2) => n.toFixed(decimals)
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n)}%`
const fmtCap = (n: number) => n >= 1e12 ? `$${fmt(n/1e12,2)}T` : n >= 1e9 ? `$${fmt(n/1e9,1)}B` : `$${fmt(n/1e6,0)}M`

async function fetchYahoo(symbols: string[], range: string) {
  const chunks: string[][] = []
  for (let i = 0; i < symbols.length; i += 40) chunks.push(symbols.slice(i, i+40))
  const results: Record<string, any> = {}
  await Promise.all(chunks.map(async chunk => {
    try {
      const r = await fetch(`/api/yahoo?symbols=${chunk.join(',')}&range=${range}`)
      const j = await r.json()
      Object.assign(results, j.data || {})
    } catch {}
  }))
  return results
}

function percentileRank(arr: number[], val: number) {
  const below = arr.filter(v => v < val).length
  return arr.length <= 1 ? 50 : (below / (arr.length - 1)) * 100
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [range, setRange]           = useState('YTD')
  const [chartMode, setChartMode]   = useState<'relative'|'price'>('relative')
  const [activeIdx, setActiveIdx]   = useState<Set<string>>(new Set(INDICES.map(i => i.key)))
  const [chartData, setChartData]   = useState<ChartPoint[]>([])
  const [stocks, setStocks]         = useState<StockRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [sortCol, setSortCol]       = useState<keyof StockRow>('score')
  const [sortDir, setSortDir]       = useState<'asc'|'desc'>('desc')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // גרפי מדדים
      const idxSymbols = INDICES.map(i => i.symbol)
      const idxData = await fetchYahoo(idxSymbols, range)
      const points: ChartPoint[] = []
      INDICES.forEach(idx => {
        const res = idxData[idx.symbol]?.result
        if (!res) return
        const timestamps: number[] = res.timestamp || []
        const closes: number[] = res.indicators?.quote?.[0]?.close || []
        const base = closes.find((c: number) => c != null) || 1
        timestamps.forEach((ts: number, i: number) => {
          const close = closes[i]
          if (close == null) return
          const date = new Date(ts * 1000).toISOString().slice(0,10)
          let pt = points.find(p => p.date === date)
          if (!pt) { pt = { date }; points.push(pt) }
          pt[idx.key] = chartMode === 'relative'
            ? parseFloat(((close - base) / base * 100).toFixed(2))
            : parseFloat(close.toFixed(2))
        })
      })
      points.sort((a,b) => String(a.date).localeCompare(String(b.date)))
      setChartData(points)

      // טבלת מניות
      const tickerSymbols = TICKERS.map(t => t.ticker)
      const stockData = await fetchYahoo(tickerSymbols, '1M')

      const rows: StockRow[] = TICKERS.map(t => {
        const res = stockData[t.ticker]?.result
        if (!res) return null
        const meta   = res.meta || {}
        const quotes = res.indicators?.quote?.[0] || {}
        const closes: number[] = (quotes.close || []).filter((c: number) => c != null)
        const price  = meta.regularMarketPrice || closes[closes.length-1] || 0
        const prev1d = meta.chartPreviousClose || closes[closes.length-2] || price
        const prev5d = closes[closes.length-6]  || prev1d
        const prev21d= closes[closes.length-22] || prev1d
        const high52w= meta.fiftyTwoWeekHigh || price
        const change1d  = prev1d  ? (price - prev1d)  / prev1d  * 100 : 0
        const change5d  = prev5d  ? (price - prev5d)  / prev5d  * 100 : 0
        const change21d = prev21d ? (price - prev21d) / prev21d * 100 : 0
        const dropFromHigh = high52w ? (price - high52w) / high52w * 100 : 0
        return {
          ticker: t.ticker, name: t.name, sector: t.sector, index: t.index,
          marketCap: meta.marketCap || 0,
          pe: meta.trailingPE || 0,
          price, change1d, change5d, change21d,
          high52w, dropFromHigh,
          delta1d: 0, delta5d: 0, delta21d: 0, score: 0
        }
      }).filter(Boolean) as StockRow[]

      // sector averages
      const sectors = [...new Set(rows.map(r => r.sector))]
      sectors.forEach(sec => {
        const group = rows.filter(r => r.sector === sec)
        const avg1d  = group.reduce((s,r) => s + r.change1d,  0) / group.length
        const avg5d  = group.reduce((s,r) => s + r.change5d,  0) / group.length
        const avg21d = group.reduce((s,r) => s + r.change21d, 0) / group.length
        group.forEach(r => { r.delta1d = r.change1d - avg1d; r.delta5d = r.change5d - avg5d; r.delta21d = r.change21d - avg21d })
      })

      // percentile score
      const all1d   = rows.map(r => r.delta1d)
      const all5d   = rows.map(r => r.delta5d)
      const all21d  = rows.map(r => r.delta21d)
      const allDrop = rows.map(r => r.dropFromHigh)
      rows.forEach(r => {
        const p1  = percentileRank(all1d,   r.delta1d)
        const p5  = percentileRank(all5d,   r.delta5d)
        const p21 = percentileRank(all21d,  r.delta21d)
        const pd  = percentileRank(allDrop, r.dropFromHigh)
        r.score = parseFloat(((p1 + p5 + p21 + pd) / 4).toFixed(1))
      })

      setStocks(rows)
      setLastUpdate(new Date().toLocaleTimeString('he-IL'))
    } finally {
      setLoading(false)
    }
  }, [range, chartMode])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { const t = setInterval(loadData, 20 * 60 * 1000); return () => clearInterval(t) }, [loadData])

  const sorted = [...stocks].sort((a,b) => {
    const av = a[sortCol] as number, bv = b[sortCol] as number
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const toggleIdx = (key: string) => setActiveIdx(prev => {
    const n = new Set(prev)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })

  const handleSort = (col: keyof StockRow) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const scoreColor = (s: number) => s >= 75 ? '#f87171' : s >= 50 ? '#fb923c' : s >= 25 ? '#fbbf24' : '#4ade80'

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid #21262d' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TrendingUp size={22} color="#4ade80" />
          <span style={{ fontWeight:700, fontSize:18 }}>Market Pulse</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {lastUpdate && <span style={{ fontSize:13, color:'#8b949e' }}>Updated {lastUpdate}</span>}
          <button onClick={loadData} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid #30363d', background:'transparent', color:'#e6edf3', cursor:'pointer', fontSize:13 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:1400, margin:'0 auto' }}>
        {/* Chart Panel */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:600 }}>Global Indices</h2>
              <p style={{ fontSize:12, color:'#8b949e', marginTop:2 }}>
                {chartMode === 'relative' ? 'Normalized to 0% at start of selected range.' : 'Actual price values.'}
              </p>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {/* mode toggle */}
              <div style={{ display:'flex', background:'#0d1117', borderRadius:8, padding:2 }}>
                {(['relative','price'] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)} style={{ padding:'4px 12px', borderRadius:6, border:'none', background: chartMode===m ? '#21262d' : 'transparent', color: chartMode===m ? '#e6edf3' : '#8b949e', cursor:'pointer', fontSize:13 }}>
                    {m === 'relative' ? 'Relative %' : 'Price'}
                  </button>
                ))}
              </div>
              {/* range */}
              <div style={{ display:'flex', background:'#0d1117', borderRadius:8, padding:2 }}>
                {RANGES.map(r => (
                  <button key={r} onClick={() => setRange(r)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background: range===r ? '#238636' : 'transparent', color: range===r ? '#fff' : '#8b949e', cursor:'pointer', fontSize:13 }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* index toggles */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
            {INDICES.map(idx => (
              <button key={idx.key} onClick={() => toggleIdx(idx.key)} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, border:`1px solid ${activeIdx.has(idx.key) ? idx.color : '#30363d'}`, background: activeIdx.has(idx.key) ? `${idx.color}22` : 'transparent', color: activeIdx.has(idx.key) ? idx.color : '#8b949e', cursor:'pointer', fontSize:13 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: activeIdx.has(idx.key) ? idx.color : '#8b949e' }} />
                {idx.label}
              </button>
            ))}
          </div>

          {/* chart */}
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#8b949e' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#8b949e' }} tickLine={false} axisLine={false} tickFormatter={v => chartMode==='relative' ? `${v>0?'+':''}${v}%` : String(v)} />
              <Tooltip
                contentStyle={{ background:'#161b22', border:'1px solid #30363d', borderRadius:8, fontSize:12 }}
                labelStyle={{ color:'#8b949e' }}
                formatter={(v: number, name: string) => {
                  const idx = INDICES.find(i => i.key === name)
                  return [chartMode==='relative' ? fmtPct(v) : fmt(v), idx?.label || name]
                }}
              />
              {INDICES.filter(i => activeIdx.has(i.key)).map(idx => (
                <Line key={idx.key} type="monotone" dataKey={idx.key} stroke={idx.color} dot={false} strokeWidth={2} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* legend */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginTop:12 }}>
            {INDICES.filter(i => activeIdx.has(i.key)).map(idx => {
              const last = chartData[chartData.length-1]?.[idx.key] as number
              const isErr = last == null
              return (
                <div key={idx.key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
                  <span style={{ width:20, height:2, background:idx.color, display:'inline-block' }} />
                  <span style={{ color:'#8b949e' }}>{idx.label}</span>
                  {isErr
                    ? <span style={{ color:'#f87171' }}>error</span>
                    : <span style={{ color: last >= 0 ? '#4ade80' : '#f87171' }}>{fmtPct(last)}</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Screener */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:18, fontWeight:600 }}>Stock Screener</h2>
            <span style={{ fontSize:13, color:'#8b949e' }}>Universe: {stocks.length} stocks</span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #21262d' }}>
                  {([
                    ['ticker','TICKER'],['name','NAME'],['index','INDEX'],['sector','SECTOR'],
                    ['marketCap','MKT CAP'],['pe','P/E'],['price','PRICE'],
                    ['score','SCORE'],['delta1d','Δ1D vs SEC'],['delta5d','Δ5D vs SEC'],
                    ['delta21d','Δ21D vs SEC'],['dropFromHigh','52W HIGH']
                  ] as [keyof StockRow, string][]).map(([col,label]) => (
                    <th key={col} onClick={() => handleSort(col)} style={{ padding:'8px 12px', textAlign:'left', color:'#8b949e', fontWeight:500, cursor:'pointer', whiteSpace:'nowrap', userSelect:'none' }}>
                      {label} {sortCol===col ? (sortDir==='desc'?'↓':'↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.ticker} style={{ borderBottom:'1px solid #21262d', background: i%2===0 ? 'transparent' : '#0d111722' }}>
                    <td style={{ padding:'10px 12px', fontWeight:700 }}>{row.ticker}</td>
                    <td style={{ padding:'10px 12px', color:'#8b949e' }}>{row.name}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, background: row.index==='NASDAQ'?'#1d4ed822':row.index==='NYSE'?'#7e22ce22':'#d9770622', color: row.index==='NASDAQ'?'#60a5fa':row.index==='NYSE'?'#a78bfa':'#fb923c' }}>
                        {row.index}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', color:'#8b949e' }}>{row.sector}</td>
                    <td style={{ padding:'10px 12px' }}>{row.marketCap ? fmtCap(row.marketCap) : '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{row.pe ? fmt(row.pe,1) : '—'}</td>
                    <td style={{ padding:'10px 12px' }}>${fmt(row.price)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontWeight:700, background:`${scoreColor(row.score)}22`, color:scoreColor(row.score) }}>
                        {row.score}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', color: row.delta1d < 0 ? '#f87171' : '#4ade80' }}>{fmtPct(row.delta1d)}</td>
                    <td style={{ padding:'10px 12px', color: row.delta5d < 0 ? '#f87171' : '#4ade80' }}>{fmtPct(row.delta5d)}</td>
                    <td style={{ padding:'10px 12px', color: row.delta21d < 0 ? '#f87171' : '#4ade80' }}>{fmtPct(row.delta21d)}</td>
                    <td style={{ padding:'10px 12px', color: row.dropFromHigh < -15 ? '#f87171' : '#8b949e' }}>{fmtPct(row.dropFromHigh)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (max-width: 768px) { table { font-size: 11px; } th, td { padding: 6px 8px !important; } }
      `}</style>
    </div>
  )
}
