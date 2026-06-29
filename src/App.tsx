import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw, TrendingUp } from 'lucide-react'

interface StockRow {
  ticker: string; name: string; sector: string; index: string
  marketCap: number; pe: number; price: number
  change1d: number; change5d: number; change21d: number
  high52w: number; dropFromHigh: number
  delta1d: number; delta5d: number; delta21d: number; score: number
}

interface ChartPoint { date: string; [key: string]: number | string | null }

const INDICES = [
  { key: 'SP500',   symbol: '^GSPC',     label: 'S&P 500',       color: '#4ade80' },
  { key: 'NASDAQ',  symbol: '^IXIC',     label: 'NASDAQ',        color: '#60a5fa' },
  { key: 'TA35',    symbol: '^TA35.TA',  label: 'TA-35',         color: '#f59e0b' },
  { key: 'STOXX',   symbol: '^STOXX50E', label: 'Euro Stoxx 50', color: '#a78bfa' },
  { key: 'NIKKEI',  symbol: '^N225',     label: 'Nikkei 225',    color: '#f87171' },
  { key: 'MSCI_EM', symbol: 'EEM',       label: 'MSCI EM',       color: '#34d399' },
  { key: 'MSCI_W',  symbol: 'URTH',      label: 'MSCI World',    color: '#fb923c' },
]

const RANGES = ['1D','1M','YTD','1Y','5Y']

const TICKERS = [
  {t:'AAPL',  name:'Apple Inc.',          s:'Technology',       i:'NASDAQ'},
  {t:'MSFT',  name:'Microsoft Corp.',     s:'Technology',       i:'NASDAQ'},
  {t:'NVDA',  name:'NVIDIA Corp.',        s:'Semiconductors',   i:'NASDAQ'},
  {t:'AMZN',  name:'Amazon.com Inc.',     s:'Consumer Disc.',   i:'NASDAQ'},
  {t:'META',  name:'Meta Platforms',      s:'Communication',    i:'NASDAQ'},
  {t:'GOOGL', name:'Alphabet Inc.',       s:'Communication',    i:'NASDAQ'},
  {t:'TSLA',  name:'Tesla Inc.',          s:'Consumer Disc.',   i:'NASDAQ'},
  {t:'AVGO',  name:'Broadcom Inc.',       s:'Semiconductors',   i:'NASDAQ'},
  {t:'COST',  name:'Costco Wholesale',    s:'Consumer Staples', i:'NASDAQ'},
  {t:'NFLX',  name:'Netflix Inc.',        s:'Communication',    i:'NASDAQ'},
  {t:'AMD',   name:'AMD',                 s:'Semiconductors',   i:'NASDAQ'},
  {t:'ADBE',  name:'Adobe Inc.',          s:'Technology',       i:'NASDAQ'},
  {t:'QCOM',  name:'Qualcomm',            s:'Semiconductors',   i:'NASDAQ'},
  {t:'INTC',  name:'Intel Corp.',         s:'Semiconductors',   i:'NASDAQ'},
  {t:'CSCO',  name:'Cisco Systems',       s:'Technology',       i:'NASDAQ'},
  {t:'TXN',   name:'Texas Instruments',   s:'Semiconductors',   i:'NASDAQ'},
  {t:'AMGN',  name:'Amgen Inc.',          s:'Healthcare',       i:'NASDAQ'},
  {t:'INTU',  name:'Intuit Inc.',         s:'Technology',       i:'NASDAQ'},
  {t:'PANW',  name:'Palo Alto Networks',  s:'Technology',       i:'NASDAQ'},
  {t:'CRWD',  name:'CrowdStrike',         s:'Technology',       i:'NASDAQ'},
  {t:'JPM',   name:'JPMorgan Chase',      s:'Financials',       i:'NYSE'},
  {t:'V',     name:'Visa Inc.',           s:'Financials',       i:'NYSE'},
  {t:'MA',    name:'Mastercard',          s:'Financials',       i:'NYSE'},
  {t:'UNH',   name:'UnitedHealth Group',  s:'Healthcare',       i:'NYSE'},
  {t:'XOM',   name:'Exxon Mobil',         s:'Energy',           i:'NYSE'},
  {t:'JNJ',   name:'Johnson & Johnson',   s:'Healthcare',       i:'NYSE'},
  {t:'WMT',   name:'Walmart Inc.',        s:'Consumer Staples', i:'NYSE'},
  {t:'PG',    name:'Procter & Gamble',    s:'Consumer Staples', i:'NYSE'},
  {t:'HD',    name:'Home Depot',          s:'Consumer Disc.',   i:'NYSE'},
  {t:'CVX',   name:'Chevron Corp.',       s:'Energy',           i:'NYSE'},
  {t:'MRK',   name:'Merck & Co.',         s:'Healthcare',       i:'NYSE'},
  {t:'LLY',   name:'Eli Lilly',           s:'Healthcare',       i:'NYSE'},
  {t:'ABBV',  name:'AbbVie Inc.',         s:'Healthcare',       i:'NYSE'},
  {t:'BAC',   name:'Bank of America',     s:'Financials',       i:'NYSE'},
  {t:'KO',    name:'Coca-Cola Co.',       s:'Consumer Staples', i:'NYSE'},
  {t:'PFE',   name:'Pfizer Inc.',         s:'Healthcare',       i:'NYSE'},
  {t:'MCD',   name:"McDonald's Corp.",    s:'Consumer Disc.',   i:'NYSE'},
  {t:'ACN',   name:'Accenture',           s:'Technology',       i:'NYSE'},
  {t:'BA',    name:'Boeing Co.',          s:'Industrials',      i:'NYSE'},
  {t:'GS',    name:'Goldman Sachs',       s:'Financials',       i:'NYSE'},
  {t:'MS',    name:'Morgan Stanley',      s:'Financials',       i:'NYSE'},
  {t:'CAT',   name:'Caterpillar Inc.',    s:'Industrials',      i:'NYSE'},
  {t:'TEVA.TA', name:'Teva Pharma',       s:'Healthcare',       i:'TASE'},
  {t:'NICE.TA', name:'NICE Ltd.',         s:'Technology',       i:'TASE'},
  {t:'CHKP.TA', name:'Check Point',       s:'Technology',       i:'TASE'},
  {t:'ESLT.TA', name:'Elbit Systems',     s:'Industrials',      i:'TASE'},
  {t:'ICL.TA',  name:'ICL Group',         s:'Materials',        i:'TASE'},
  {t:'LUMI.TA', name:'Bank Leumi',        s:'Financials',       i:'TASE'},
  {t:'HARL.TA', name:'Bank Hapoalim',     s:'Financials',       i:'TASE'},
]

const SECTOR_ETF: Record<string,string> = {
  'Technology':'XLK','Semiconductors':'SOXX','Financials':'XLF',
  'Healthcare':'XLV','Energy':'XLE','Consumer Disc.':'XLY',
  'Consumer Staples':'XLP','Industrials':'XLI','Materials':'XLB',
  'Communication':'XLC','Utilities':'XLU','Real Estate':'XLRE',
}

const fmt = (n: number, d = 2) => isNaN(n) ? '—' : n.toFixed(d)
const fmtPct = (n: number) => isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${fmt(n)}%`
const fmtCap = (n: number) => !n ? '—' : n >= 1e12 ? `$${fmt(n/1e12,2)}T` : n >= 1e9 ? `$${fmt(n/1e9,1)}B` : `$${fmt(n/1e6,0)}M`

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

// Custom tooltip
const CustomTooltip = ({ active, payload, label, mode }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#8b949e', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => {
        if (p.value == null) return null
        const val = p.value as number
        return (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ color: '#8b949e' }}>{p.name}:</span>
            <span style={{ color: '#e6edf3', fontWeight: 600 }}>
              {mode === 'relative' ? fmtPct(val) : `${val.toFixed(2)}`}
            </span>
            {mode === 'price' && (
              <span style={{ color: val >= 100 ? '#4ade80' : '#f87171', fontSize: 11 }}>
                ({fmtPct(val - 100)})
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

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
      // ── גרפי מדדים ──
      const idxData = await fetchYahoo(INDICES.map(i => i.symbol), range)
      const pts: ChartPoint[] = []

      INDICES.forEach(idx => {
        // תמיכה ב-fallback: הAPI מחזיר את הנתונים תחת הסימבול המקורי
        const res = idxData[idx.symbol]?.result
        if (!res) return
        const timestamps: number[] = res.timestamp || []
        const closes: number[] = res.indicators?.quote?.[0]?.close || []
        const base = closes.find((c: number) => c != null) || 1

        timestamps.forEach((ts: number, i: number) => {
          const close = closes[i]
          if (close == null) return
          const date = new Date(ts * 1000).toISOString().slice(0, 10)
          let pt = pts.find(p => p.date === date)
          if (!pt) { pt = { date }; pts.push(pt) }

          if (chartMode === 'relative') {
            // Relative %: כמה % עלה/ירד מתחילת התקופה
            pt[idx.key] = parseFloat(((close - base) / base * 100).toFixed(2))
          } else {
            // Price mode: indexed to 100 — כל מדד מתחיל מ-100
            // כך כל המדדים על אותו ציר Y וניתן להשוות צורות
            pt[idx.key] = parseFloat((close / base * 100).toFixed(2))
          }
        })
      })

      pts.sort((a, b) => String(a.date).localeCompare(String(b.date)))
      setChartData(pts)

      // ── סורק מניות ──
      const sectorEtfs = [...new Set(Object.values(SECTOR_ETF))]
      const [stockData, etfData] = await Promise.all([
        fetchYahoo(TICKERS.map(t => t.t), '1M'),
        fetchYahoo(sectorEtfs, '1M')
      ])

      const etfPerf: Record<string, number> = {}
      sectorEtfs.forEach(etf => {
        const res = etfData[etf]?.result
        if (!res) return
        const closes: number[] = (res.indicators?.quote?.[0]?.close || []).filter((c: any) => c != null)
        const last = closes[closes.length-1]
        const prev1  = closes[closes.length-2] || last
        const prev5  = closes[closes.length-6] || closes[0]
        const prev21 = closes[closes.length-22] || closes[0]
        if (prev1)  etfPerf[etf+'_1d']  = (last-prev1)/prev1*100
        if (prev5)  etfPerf[etf+'_5d']  = (last-prev5)/prev5*100
        if (prev21) etfPerf[etf+'_21d'] = (last-prev21)/prev21*100
      })

      const rows: StockRow[] = TICKERS.map(tk => {
        const res = stockData[tk.t]?.result
        if (!res) return null
        const meta   = res.meta || {}
        const closes: number[] = (res.indicators?.quote?.[0]?.close || []).filter((c: any) => c != null)
        const price   = meta.regularMarketPrice || closes[closes.length-1] || 0
        const prev1d  = meta.chartPreviousClose || closes[closes.length-2] || price
        const prev5d  = closes[closes.length-6]  || closes[0] || prev1d
        const prev21d = closes[closes.length-22] || closes[0] || prev1d
        const high52w = meta.fiftyTwoWeekHigh || price
        const ch1d   = prev1d  ? (price-prev1d)/prev1d*100   : 0
        const ch5d   = prev5d  ? (price-prev5d)/prev5d*100   : 0
        const ch21d  = prev21d ? (price-prev21d)/prev21d*100 : 0
        const drop   = high52w ? (price-high52w)/high52w*100 : 0
        const etf    = SECTOR_ETF[tk.s] || 'SPY'
        const d1d    = ch1d  - (etfPerf[etf+'_1d']  || 0)
        const d5d    = ch5d  - (etfPerf[etf+'_5d']  || 0)
        const d21d   = ch21d - (etfPerf[etf+'_21d'] || 0)
        return {
          ticker: tk.t, name: tk.name, sector: tk.s, index: tk.i,
          marketCap: meta.marketCap || 0,
          pe: meta.trailingPE || meta.forwardPE || 0,
          price, change1d: ch1d, change5d: ch5d, change21d: ch21d,
          high52w, dropFromHigh: drop,
          delta1d: d1d, delta5d: d5d, delta21d: d21d, score: 0
        }
      }).filter(Boolean) as StockRow[]

      const a1=rows.map(r=>r.delta1d), a5=rows.map(r=>r.delta5d)
      const a21=rows.map(r=>r.delta21d), aDrop=rows.map(r=>r.dropFromHigh)
      rows.forEach(r => {
        r.score = parseFloat((
          (percentileRank(a1,r.delta1d)+percentileRank(a5,r.delta5d)+
           percentileRank(a21,r.delta21d)+percentileRank(aDrop,r.dropFromHigh))/4
        ).toFixed(1))
      })

      setStocks(rows)
      setLastUpdate(new Date().toLocaleTimeString('he-IL'))
    } finally {
      setLoading(false)
    }
  }, [range, chartMode])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const t = setInterval(loadData, 20*60*1000)
    return () => clearInterval(t)
  }, [loadData])

  const sorted = [...stocks].sort((a, b) => {
    const av = a[sortCol] as number, bv = b[sortCol] as number
    return sortDir === 'desc' ? bv-av : av-bv
  })

  const toggleIdx = (key: string) => setActiveIdx(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const handleSort = (col: keyof StockRow) => {
    if (sortCol === col) setSortDir(d => d==='desc'?'asc':'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const scoreColor = (s: number) => s>=75?'#f87171':s>=50?'#fb923c':s>=25?'#fbbf24':'#4ade80'
  const activeIndices = INDICES.filter(i => activeIdx.has(i.key))

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', color:'#e6edf3', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid #21262d', background:'#0d1117', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TrendingUp size={20} color="#4ade80" />
          <span style={{ fontWeight:700, fontSize:16 }}>Market Pulse</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {lastUpdate && <span style={{ fontSize:12, color:'#8b949e' }}>Updated {lastUpdate}</span>}
          <button onClick={loadData} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:6, border:'1px solid #30363d', background:'transparent', color:'#e6edf3', cursor:'pointer', fontSize:12 }}>
            <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:'16px 20px', maxWidth:1400, margin:'0 auto' }}>
        {/* Chart Panel */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:600 }}>Global Indices</h2>
              <p style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>
                {chartMode==='relative'
                  ? 'Normalized to 0% at start of range.'
                  : 'Indexed to 100 at start of range — same scale, comparable shapes.'}
              </p>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <div style={{ display:'flex', background:'#0d1117', borderRadius:6, padding:2 }}>
                {(['relative','price'] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)} style={{ padding:'3px 10px', borderRadius:5, border:'none', background:chartMode===m?'#21262d':'transparent', color:chartMode===m?'#e6edf3':'#8b949e', cursor:'pointer', fontSize:12 }}>
                    {m==='relative'?'Relative %':'Indexed'}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', background:'#0d1117', borderRadius:6, padding:2 }}>
                {RANGES.map(r => (
                  <button key={r} onClick={() => setRange(r)} style={{ padding:'3px 10px', borderRadius:5, border:'none', background:range===r?'#238636':'transparent', color:range===r?'#fff':'#8b949e', cursor:'pointer', fontSize:12 }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Index toggles */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {INDICES.map(idx => (
              <button key={idx.key} onClick={() => toggleIdx(idx.key)} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:16, border:`1px solid ${activeIdx.has(idx.key)?idx.color:'#30363d'}`, background:activeIdx.has(idx.key)?`${idx.color}22`:'transparent', color:activeIdx.has(idx.key)?idx.color:'#8b949e', cursor:'pointer', fontSize:12 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:activeIdx.has(idx.key)?idx.color:'#8b949e' }} />
                {idx.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#8b949e' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize:10, fill:'#8b949e' }} tickLine={false} axisLine={false}
                tickFormatter={v => chartMode==='relative' ? `${v>0?'+':''}${v}%` : `${v}`}
              />
              <Tooltip content={<CustomTooltip mode={chartMode} />} />
              {activeIndices.map(idx => (
                <Line key={idx.key} type="monotone" dataKey={idx.key} name={idx.label} stroke={idx.color} dot={false} strokeWidth={2} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:10 }}>
            {activeIndices.map(idx => {
              const last = chartData.slice().reverse().find(p => p[idx.key] != null)?.[idx.key] as number
              const chgPct = last != null
                ? (chartMode==='relative' ? last : last - 100)
                : null
              return (
                <div key={idx.key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                  <span style={{ width:18, height:2, background:idx.color, display:'inline-block' }} />
                  <span style={{ color:'#8b949e' }}>{idx.label}</span>
                  {chgPct == null
                    ? <span style={{ color:'#f87171' }}>error</span>
                    : <span style={{ color:chgPct>=0?'#4ade80':'#f87171' }}>{fmtPct(chgPct)}</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Screener */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ fontSize:15, fontWeight:600 }}>Stock Screener</h2>
            <span style={{ fontSize:12, color:'#8b949e' }}>Universe: {stocks.length} stocks</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #21262d' }}>
                  {([
                    ['ticker','TICKER'],['name','NAME'],['index','INDEX'],['sector','SECTOR'],
                    ['marketCap','MKT CAP'],['pe','P/E'],['price','PRICE'],
                    ['score','SCORE'],['delta1d','Δ1D vs ETF'],['delta5d','Δ5D vs ETF'],
                    ['delta21d','Δ21D vs ETF'],['dropFromHigh','52W HIGH']
                  ] as [keyof StockRow,string][]).map(([col,label]) => (
                    <th key={col} onClick={() => handleSort(col)} style={{ padding:'7px 10px', textAlign:'left', color:'#8b949e', fontWeight:500, cursor:'pointer', whiteSpace:'nowrap', userSelect:'none' }}>
                      {label}{sortCol===col?(sortDir==='desc'?' ↓':' ↑'):''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.ticker} style={{ borderBottom:'1px solid #21262d', background:i%2===0?'transparent':'#0d111722' }}>
                    <td style={{ padding:'8px 10px', fontWeight:700 }}>{row.ticker}</td>
                    <td style={{ padding:'8px 10px', color:'#8b949e' }}>{row.name}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ padding:'1px 7px', borderRadius:3, fontSize:10, fontWeight:600, background:row.index==='NASDAQ'?'#1d4ed822':row.index==='NYSE'?'#7e22ce22':'#d9770622', color:row.index==='NASDAQ'?'#60a5fa':row.index==='NYSE'?'#a78bfa':'#fb923c' }}>
                        {row.index}
                      </span>
                    </td>
                    <td style={{ padding:'8px 10px', color:'#8b949e' }}>{row.sector}</td>
                    <td style={{ padding:'8px 10px' }}>{fmtCap(row.marketCap)}</td>
                    <td style={{ padding:'8px 10px' }}>{row.pe?fmt(row.pe,1):'—'}</td>
                    <td style={{ padding:'8px 10px' }}>${fmt(row.price)}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ padding:'2px 9px', borderRadius:14, fontWeight:700, fontSize:12, background:`${scoreColor(row.score)}22`, color:scoreColor(row.score) }}>
                        {row.score}
                      </span>
                    </td>
                    <td style={{ padding:'8px 10px', color:row.delta1d<0?'#f87171':'#4ade80' }}>{fmtPct(row.delta1d)}</td>
                    <td style={{ padding:'8px 10px', color:row.delta5d<0?'#f87171':'#4ade80' }}>{fmtPct(row.delta5d)}</td>
                    <td style={{ padding:'8px 10px', color:row.delta21d<0?'#f87171':'#4ade80' }}>{fmtPct(row.delta21d)}</td>
                    <td style={{ padding:'8px 10px', color:row.dropFromHigh<-15?'#f87171':'#8b949e' }}>{fmtPct(row.dropFromHigh)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){table{font-size:11px}th,td{padding:5px 7px!important}}
      `}</style>
    </div>
  )
}
