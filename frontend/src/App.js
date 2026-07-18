import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import ScreenerPage from "./ScreenerPage";
import WhatsAppSubscribePage from "./WhatsAppSubscribePage";
import AuthPage from "./AuthPage";
import { useAuth } from "./AuthContext";

const API = "https://kss-1227-trademind.hf.space";

const T = {
  bg:"#080E1A", surface:"#0D1F35", raised:"#132840",
  border:"#1E3A5F", teal:"#00C9A7", tealDim:"#009E84",
  gold:"#F6C90E", danger:"#F25C54", white:"#F0F4F8",
  muted:"#64748B", dim:"#334155",
};

const STOCKS = [
  "RELIANCE","TCS","INFY","HDFCBANK","WIPRO",
  "ICICIBANK","BAJFINANCE","SBIN","ITC","ADANIENT",
  "NIFTYBEES","GOLDBEES","SILVERBEES","GOLD24K","SILVER",
];

const STOCK_LABELS = {
  NIFTYBEES:"NIFTY ETF", GOLDBEES:"Gold ETF",
  SILVERBEES:"Silver ETF", GOLD24K:"Gold 24K", SILVER:"Silver",
};

const SIG_COLOR = {
  BUY:{ bg:"#00C9A7", text:"#000" },
  HOLD:{ bg:"#F6C90E", text:"#000" },
  SELL:{ bg:"#F25C54", text:"#fff" },
};

const NAV = [
  { id:"dashboard",   icon:"📊", label:"Home" },
  { id:"analyse",     icon:"🔍", label:"Analyse" },
  { id:"portfolio",   icon:"📁", label:"Portfolio" },
  { id:"backtest",    icon:"📈", label:"Backtest" },
  { id:"commodities", icon:"🥇", label:"Commodities" },
  { id:"screener",    icon:"💬", label:"Screener" },
  { id:"whatsapp",    icon:"📲", label:"WhatsApp" },
];

// ── Custom hook for screen size ──────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const fmt = (n) => Number(n)?.toLocaleString("en-IN") ?? "—";
const parseConf = (c) => {
  if (c === undefined || c === null) return 0;
  const s = c.toString();
  return s.includes("%") ? parseInt(s) : Math.round(Number(s) * 100);
};

// ── Global CSS ───────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-text-size-adjust:100%}
  body{background:#080E1A;color:#F0F4F8;font-family:'Inter',sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#080E1A}
  ::-webkit-scrollbar-thumb{background:#1E3A5F;border-radius:3px}
  .mono{font-family:'JetBrains Mono',monospace}
  .card{background:#0D1F35;border:1px solid #1E3A5F;border-radius:12px;padding:16px}
  @media(min-width:768px){.card{padding:20px}}
  .btn{background:#00C9A7;color:#000;border:none;border-radius:8px;padding:11px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s;width:100%}
  @media(min-width:768px){.btn{width:auto}}
  .btn:hover{opacity:0.85}
  .btn:disabled{opacity:0.45;cursor:not-allowed}
  .sig-badge{display:inline-block;width:72px;text-align:center;padding:5px 0;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:1px}
  .tab-bar{display:flex;gap:2px;border-bottom:1px solid #1E3A5F;margin-bottom:16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .tab-bar::-webkit-scrollbar{display:none}
  .tab{padding:9px 12px;font-size:12px;font-weight:600;color:#64748B;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:'Inter',sans-serif;flex-shrink:0}
  .tab.active{color:#00C9A7;border-bottom-color:#00C9A7}
  .reason-item{padding:9px 12px;border-left:2px solid #00C9A7;background:#132840;border-radius:0 8px 8px 0;font-size:12px;color:#F0F4F8;line-height:1.5}
  .stock-btn{padding:6px 12px;border-radius:7px;border:1px solid #1E3A5F;background:#0D1F35;color:#64748B;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;flex-shrink:0}
  .stock-btn.active{background:rgba(0,201,167,0.12);border-color:#00C9A7;color:#00C9A7}
  .metric-card{background:#0D1F35;border:1px solid #1E3A5F;border-radius:10px;padding:12px 8px;text-align:center}
  @media(min-width:768px){.metric-card{padding:16px}}
  .metric-value{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;margin-bottom:3px}
  @media(min-width:768px){.metric-value{font-size:22px}}
  .metric-label{font-size:10px;color:#64748B;letter-spacing:0.5px;text-transform:uppercase}
  .agent-step{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:12px;color:#64748B;transition:color 0.3s}
  .agent-step.done{color:#00C9A7}
  .agent-step.active{color:#F0F4F8}
  .dot-pulse{width:8px;height:8px;border-radius:50%;background:#00C9A7;animation:pulse 1s infinite;flex-shrink:0}
  .dot-done{width:8px;height:8px;border-radius:50%;background:#00C9A7;flex-shrink:0}
  .dot-idle{width:8px;height:8px;border-radius:50%;background:#334155;flex-shrink:0}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
  .live-dot{width:6px;height:6px;border-radius:50%;background:#00C9A7;animation:pulse 2s infinite;display:inline-block;margin-right:4px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn 0.3s ease}
  .stocks-scroll{display:flex;flex-wrap:wrap;gap:8px}
  @media(max-width:767px){.stocks-scroll{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none}.stocks-scroll::-webkit-scrollbar{display:none}}
  .grid-2{display:grid;grid-template-columns:1fr;gap:12px}
  @media(min-width:640px){.grid-2{grid-template-columns:1fr 1fr}}
  .grid-3{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(min-width:768px){.grid-3{grid-template-columns:repeat(3,1fr)}}
  .grid-4{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(min-width:768px){.grid-4{grid-template-columns:repeat(4,1fr)}}
  .signal-header{display:flex;flex-direction:column;gap:12px}
  @media(min-width:480px){.signal-header{flex-direction:row;justify-content:space-between;align-items:flex-start}}
  .alloc-row{display:grid;grid-template-columns:1fr 48px 80px 72px;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;background:#132840;margin-bottom:6px;font-size:12px}
  @media(min-width:480px){.alloc-row{grid-template-columns:1.5fr 56px 90px 72px 72px;font-size:13px}}
  .alloc-header{display:grid;grid-template-columns:1fr 48px 80px 72px;gap:8px;padding:4px 12px;font-size:9px;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px}
  @media(min-width:480px){.alloc-header{grid-template-columns:1.5fr 56px 90px 72px 72px;font-size:10px}}
  .conf-col{display:none}
  @media(min-width:480px){.conf-col{display:block}}
  .page-title{font-size:18px;font-weight:800;color:#F0F4F8;margin-bottom:4px}
  @media(min-width:768px){.page-title{font-size:22px}}
  .page-sub{color:#64748B;font-size:12px;margin-bottom:18px}
  @media(min-width:768px){.page-sub{font-size:13px;margin-bottom:22px}}
`;

// ── Top Bar ──────────────────────────────────────────────
function TopBar({ gold, onMenuToggle, isMobile }) {
  const [nifty, setNifty] = useState(null);
  useEffect(() => {
    axios.get(`${API}/prices/NIFTYBEES`)
      .then(r => {
        const d = r.data.data;
        if (d?.length >= 2) {
          const last = d[d.length-1].Close;
          const prev = d[d.length-2].Close;
          const chg  = ((last-prev)/prev*100).toFixed(2);
          setNifty({ value: last.toFixed(1), change: chg });
        }
      }).catch(()=>{});
  }, []);

  return (
    <header style={{
      position:"fixed", top:0, left:0, right:0, zIndex:100,
      height:52, background:T.surface,
      borderBottom:`1px solid ${T.border}`,
      display:"flex", alignItems:"center",
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"0 14px", flexShrink:0,
        borderRight:`1px solid ${T.border}`, height:"100%",
        minWidth: isMobile ? 140 : 190,
      }}>
        <span style={{fontSize:18}}>💹</span>
        <div>
          <div style={{fontSize:14, fontWeight:800, letterSpacing:1, color:T.white}}>TradeMind</div>
          <div style={{fontSize:8, color:T.teal, letterSpacing:0.5}}>AI CO-PILOT · NSE</div>
        </div>
      </div>

      {!isMobile && (
        <div style={{display:"flex", alignItems:"center", flex:1, height:"100%", overflow:"hidden"}}>
          {nifty && (
            <div style={{display:"flex", alignItems:"center", gap:6, padding:"0 16px", borderRight:`1px solid ${T.border}`, whiteSpace:"nowrap"}}>
              <span style={{fontSize:10, color:T.muted}}>NIFTY</span>
              <span style={{fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:600, color:parseFloat(nifty.change)>=0?T.teal:T.danger}}>
                ₹{nifty.value}
              </span>
              <span style={{fontSize:10, color:parseFloat(nifty.change)>=0?T.teal:T.danger}}>
                {parseFloat(nifty.change)>=0?"+":""}{nifty.change}%
              </span>
            </div>
          )}
          {gold && (
            <div style={{display:"flex", alignItems:"center", gap:6, padding:"0 16px", borderRight:`1px solid ${T.border}`, whiteSpace:"nowrap"}}>
              <span style={{fontSize:10, color:T.muted}}>GOLD 24K/10g</span>
              <span style={{fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:600, color:T.gold}}>
                ₹{fmt(gold.current_price_10g)}
              </span>
            </div>
          )}
        </div>
      )}

      {isMobile && gold && (
        <div style={{flex:1, display:"flex", alignItems:"center", padding:"0 10px"}}>
          <span style={{fontSize:10, color:T.muted}}>GOLD </span>
          <span style={{fontFamily:"JetBrains Mono,monospace", fontSize:11, color:T.gold, marginLeft:4}}>
            ₹{fmt(gold.current_price_10g)}/10g
          </span>
        </div>
      )}

      <div style={{padding:"0 14px", display:"flex", alignItems:"center", gap:5}}>
        <span className="live-dot"/>
        <span style={{fontSize:10, color:T.teal, fontWeight:600}}>LIVE</span>
      </div>
    </header>
  );
}

// ── Desktop Sidebar ──────────────────────────────────────
function Sidebar({ active, onNav }) {
  const [hovered, setHovered] = useState(null);
  return (
    <aside style={{
      position:"fixed", left:0, top:52, bottom:0, width:60,
      background:T.surface, borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column",
      alignItems:"center", paddingTop:12, gap:2, zIndex:90,
    }}>
      {NAV.map(n => (
        <div key={n.id} style={{position:"relative", width:"100%"}}>
          <button
            onClick={() => onNav(n.id)}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width:"100%", height:46,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:active===n.id?"rgba(0,201,167,0.1)":"transparent",
              border:"none",
              borderLeft:`3px solid ${active===n.id?T.teal:"transparent"}`,
              cursor:"pointer", fontSize:17, transition:"all 0.15s",
            }}
            title={n.label}
          >{n.icon}</button>
          {hovered===n.id && (
            <div style={{
              position:"absolute", left:66, top:"50%", transform:"translateY(-50%)",
              background:T.raised, border:`1px solid ${T.border}`,
              borderRadius:6, padding:"4px 10px",
              fontSize:12, fontWeight:600, color:T.white,
              whiteSpace:"nowrap", pointerEvents:"none", zIndex:200,
            }}>{n.label}</div>
          )}
        </div>
      ))}
    </aside>
  );
}

// ── Mobile Bottom Nav ────────────────────────────────────
function BottomNav({ active, onNav }) {
  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0,
      background:T.surface, borderTop:`1px solid ${T.border}`,
      display:"flex", justifyContent:"space-around",
      padding:"6px 0 8px", zIndex:100,
      paddingBottom:"max(8px, env(safe-area-inset-bottom))",
    }}>
      {NAV.map(n => (
        <button key={n.id} onClick={() => onNav(n.id)}
          style={{
            background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:2, color:active===n.id?T.teal:T.muted,
            minWidth:52, padding:"2px 4px",
          }}>
          <span style={{fontSize:19}}>{n.icon}</span>
          <span style={{fontSize:9, fontWeight:600, fontFamily:"Inter,sans-serif",
            color:active===n.id?T.teal:T.muted}}>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Agent Loader ─────────────────────────────────────────
function AgentLoader({ step }) {
  const steps = [
    "Research Agent — fetching price + news",
    "Signal Agent — running ML model",
    "Explainer Agent — generating reasons",
  ];
  return (
    <div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13, fontWeight:600, color:T.white, marginBottom:12}}>
        Analysing with AI...
      </div>
      {steps.map((s,i) => (
        <div key={i} className={`agent-step ${i<step?"done":i===step?"active":""}`}>
          {i<step?<span className="dot-done"/>:i===step?<span className="dot-pulse"/>:<span className="dot-idle"/>}
          {s}
        </div>
      ))}
    </div>
  );
}

// ── Signal Card ──────────────────────────────────────────
function SignalCard({ signal, isMobile }) {
  const [tab, setTab]       = useState("signal");
  const [prices, setPrices] = useState([]);
  const sig  = SIG_COLOR[signal.signal] || SIG_COLOR.HOLD;
  const conf = parseConf(signal.confidence);

  useEffect(() => {
    const sym = signal.symbol?.replace(".NS","") || "";
    axios.get(`${API}/prices/${sym}`)
      .then(r => setPrices(r.data.data||[]))
      .catch(()=>{});
  }, [signal.symbol]);

  return (
    <div className="fade-in">
      {/* Signal header */}
      <div className="card" style={{marginBottom:12}}>
        <div className="signal-header">
          <div>
            <div style={{fontSize:10, color:T.muted, letterSpacing:1, marginBottom:3}}>
              {signal.symbol} · NSE
            </div>
            <div className="mono" style={{fontSize:isMobile?22:28, fontWeight:800, color:T.white}}>
              {signal.price}
            </div>
            <div style={{fontSize:10, color:T.muted, marginTop:2}}>{signal.timestamp}</div>
          </div>
          <div style={{display:"flex", flexDirection:"column", alignItems:isMobile?"flex-start":"flex-end", gap:4}}>
            <span className="sig-badge" style={{background:sig.bg, color:sig.text}}>
              {signal.signal}
            </span>
            <div style={{fontSize:11, color:T.muted}}>Confidence</div>
            <div className="mono" style={{fontSize:15, fontWeight:700, color:sig.bg}}>{conf}%</div>
            <div style={{width:80, height:3, background:T.dim, borderRadius:2}}>
              <div style={{width:`${conf}%`, height:3, background:sig.bg, borderRadius:2}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Risk row */}
      <div className="grid-3" style={{marginBottom:12}}>
        {[
          {label:"Sharpe",   value:signal.risk?.sharpe,    color:T.teal},
          {label:"Drawdown", value:signal.risk?.drawdown,  color:T.danger},
          {label:"VaR 95%",  value:signal.risk?.var,       color:T.gold},
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-value" style={{color:m.color}}>{m.value||"—"}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {["signal","chart","sentiment"].map(t => (
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t==="signal"?"Why This Signal":t==="chart"?"Price Chart":"Sentiment"}
          </button>
        ))}
      </div>

      {tab==="signal" && (
        <div className="card fade-in">
          <div style={{fontSize:12, fontWeight:700, color:T.teal, marginBottom:10, letterSpacing:0.5}}>
            🤖 SHAP EXPLANATION
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:7}}>
            {signal.reasons?.map((r,i) => <div key={i} className="reason-item">{r}</div>)}
          </div>
          {signal.risk?.note && (
            <div style={{
              marginTop:12, padding:"9px 12px",
              background:"rgba(246,201,14,0.06)",
              border:"1px solid rgba(246,201,14,0.2)",
              borderRadius:8, fontSize:12, color:T.gold,
            }}>{signal.risk.note}</div>
          )}
        </div>
      )}

      {tab==="chart" && (
        <div className="card fade-in">
          <div style={{fontSize:11, fontWeight:600, color:T.muted, marginBottom:12}}>
            {signal.symbol?.replace(".NS","")} · Last 90 Days
          </div>
          {prices.length>0 ? (
            <ResponsiveContainer width="100%" height={isMobile?200:260}>
              <AreaChart data={prices}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.teal} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={T.teal} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="Date" tick={{fill:T.muted, fontSize:9}}
                  tickFormatter={v=>v.slice(5)} interval={isMobile?20:14}/>
                <YAxis tick={{fill:T.muted, fontSize:9}}
                  tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} domain={["auto","auto"]}
                  width={45}/>
                <Tooltip
                  contentStyle={{background:T.raised, border:`1px solid ${T.border}`,
                    borderRadius:8, color:T.white, fontSize:11}}
                  formatter={v=>[`₹${fmt(v)}`,"Price"]} labelFormatter={l=>`Date: ${l}`}/>
                <Area type="monotone" dataKey="Close" stroke={T.teal}
                  strokeWidth={2} fill="url(#pg)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign:"center", color:T.muted, padding:30}}>Loading chart...</div>
          )}
        </div>
      )}

      {tab==="sentiment" && (
        <div className="card fade-in">
          <div style={{fontSize:12, fontWeight:700, color:T.teal, marginBottom:12, letterSpacing:0.5}}>
            📰 FINBERT SENTIMENT
          </div>
          <div style={{display:"flex", gap:10}}>
            {Object.entries(signal.sentiment?.scores||{}).map(([k,v]) => {
              const color = k==="positive"?T.teal:k==="negative"?T.danger:T.gold;
              const pct   = Math.round(v*100);
              return (
                <div key={k} style={{flex:1, background:T.raised, borderRadius:10,
                  padding:12, textAlign:"center"}}>
                  <div className="mono" style={{fontSize:isMobile?20:26, fontWeight:800, color}}>{pct}%</div>
                  <div style={{fontSize:10, color:T.muted, marginTop:3, textTransform:"capitalize"}}>{k}</div>
                  <div style={{height:3, background:T.dim, borderRadius:2, marginTop:8}}>
                    <div style={{height:3, width:`${pct}%`, background:color, borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────
function Dashboard({ onNav, gold, isMobile }) {
  const stats = [
    {label:"Assets",       value:"13",    sub:"NSE + Commodities", color:T.teal},
    {label:"Gold/10g",     value:gold?`₹${fmt(gold.current_price_10g)}`:"—", sub:"Live MCX", color:T.gold},
    {label:"Win Rate",     value:"90%",   sub:"Backtested",         color:T.teal},
    {label:"Return",       value:"30%+",  sub:"2-year test",        color:T.teal},
  ];

  return (
    <div className="fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Good morning. Markets are open.</h1>
        <p className="page-sub">TradeMind is watching 13 NSE assets.</p>
      </div>

      <div className="grid-4" style={{marginBottom:14}}>
        {stats.map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-value" style={{color:s.color}}>{s.value}</div>
            <div className="metric-label">{s.label}</div>
            <div style={{fontSize:9, color:T.dim, marginTop:2, fontStyle:"italic"}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:11, color:T.muted, letterSpacing:0.8, marginBottom:10, fontWeight:700}}>
          QUICK ANALYSE
        </div>
        <div className="stocks-scroll" style={{marginBottom:14}}>
          {STOCKS.map(s => (
            <button key={s} className="stock-btn" onClick={() => onNav("analyse",s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => onNav("analyse")}>
          Open Full Analyser →
        </button>
      </div>

      <div className="grid-3">
        {[
          {icon:"📁", title:"Portfolio Mode", desc:"AI allocates capital across 3-5 assets.", nav:"portfolio"},
          {icon:"📈", title:"Backtest Engine", desc:"2-year simulation vs Nifty50.", nav:"backtest"},
          {icon:"🥇", title:"Commodities",     desc:"Live Gold 24K + Silver signals.", nav:"commodities"},
        ].map(f => (
          <div key={f.title} className="card" style={{cursor:"pointer"}} onClick={() => onNav(f.nav)}>
            <div style={{fontSize:20, marginBottom:8}}>{f.icon}</div>
            <div style={{fontSize:13, fontWeight:700, color:T.white, marginBottom:4}}>{f.title}</div>
            <div style={{fontSize:11, color:T.muted, lineHeight:1.5}}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analyse Page ─────────────────────────────────────────
function AnalysePage({ initialStock, isMobile }) {
  const [selected, setSelected] = useState(initialStock||"RELIANCE");
  const [signal,   setSignal]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [error,    setError]    = useState(null);

  const analyse = useCallback(async (sym) => {
    const s = sym||selected;
    setLoading(true); setSignal(null); setError(null); setStep(0);
    const t1 = setTimeout(()=>setStep(1),3000);
    const t2 = setTimeout(()=>setStep(2),7000);
    try {
      const r = await axios.get(`${API}/signal/${s}`);
      setSignal(r.data);
    } catch(e) {
      setError(e.response?.data?.detail||"Analysis failed — try again");
    }
    clearTimeout(t1); clearTimeout(t2);
    setLoading(false); setStep(0);
  },[selected]);

  useEffect(() => { if(initialStock) analyse(initialStock); },[initialStock]);

  return (
    <div className="fade-in">
      <h1 className="page-title">Stock Analysis</h1>
      <p className="page-sub">AI signal with SHAP explanation for any NSE asset.</p>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:11, color:T.muted, letterSpacing:0.8, marginBottom:10, fontWeight:700}}>
          SELECT ASSET
        </div>
        <div className="stocks-scroll" style={{marginBottom:14}}>
          {STOCKS.map(s => (
            <button key={s} className={`stock-btn ${selected===s?"active":""}`}
              onClick={()=>setSelected(s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <button className="btn" onClick={()=>analyse(selected)} disabled={loading}>
          {loading?"Analysing...":` Analyse ${STOCK_LABELS[selected]||selected}`}
        </button>
      </div>

      {loading && <AgentLoader step={step}/>}
      {error && (
        <div style={{padding:14, background:"rgba(242,92,84,0.1)",
          border:`1px solid ${T.danger}`, borderRadius:10,
          color:T.danger, fontSize:13, marginBottom:14}}>
          ⚠️ {error}
        </div>
      )}
      {signal && <SignalCard signal={signal} isMobile={isMobile}/>}
    </div>
  );
}

// ── Portfolio Page ───────────────────────────────────────
function PortfolioPage({ isMobile }) {
  const [selected, setSelected] = useState([]);
  const [capital,  setCapital]  = useState(100000);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const toggle = s => setSelected(p =>
    p.includes(s)?p.filter(x=>x!==s):p.length<5?[...p,s]:p
  );

  const generate = async () => {
    if(selected.length<2) return;
    setLoading(true); setResult(null);
    try {
      const signals = await Promise.all(
        selected.map(s=>axios.get(`${API}/signal/${s}`).then(r=>r.data))
      );
      const buys  = signals.filter(s=>s.signal==="BUY");
      const holds = signals.filter(s=>s.signal==="HOLD");
      const pool  = buys.length>0?buys:holds;
      const total = pool.reduce((a,s)=>a+parseConf(s.confidence),0);
      const allocs = pool.map(s=>{
        const c = parseConf(s.confidence);
        return {
          symbol:s.symbol?.replace(".NS",""),
          signal:s.signal, confidence:c,
          weight:total>0?Math.round(c/total*100):Math.round(100/pool.length),
          amount:total>0?Math.round(capital*c/total):Math.round(capital/pool.length),
        };
      });
      const sells = signals.filter(s=>s.signal==="SELL").map(s=>({
        symbol:s.symbol?.replace(".NS",""), signal:"SELL", weight:0, amount:0, confidence:parseConf(s.confidence),
      }));
      setResult({allocs:[...allocs,...sells], capital});
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const PIE_COLORS=[T.teal,T.gold,"#7C3AED","#2563EB",T.danger];

  return (
    <div className="fade-in">
      <h1 className="page-title">Portfolio Mode</h1>
      <p className="page-sub">Select 2-5 assets — AI suggests optimal allocation.</p>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:11, color:T.muted, letterSpacing:0.8, marginBottom:10, fontWeight:700}}>
          SELECT ASSETS (max 5) — {selected.length}/5
        </div>
        <div className="stocks-scroll" style={{marginBottom:14}}>
          {STOCKS.map(s=>(
            <button key={s} className={`stock-btn ${selected.includes(s)?"active":""}`}
              onClick={()=>toggle(s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap"}}>
          <div style={{flex:1, minWidth:140}}>
            <div style={{fontSize:11, color:T.muted, marginBottom:6, fontWeight:600}}>CAPITAL (₹)</div>
            <input type="number" value={capital} onChange={e=>setCapital(Number(e.target.value))}
              style={{
                background:T.raised, border:`1px solid ${T.border}`,
                borderRadius:8, padding:"9px 12px", color:T.white,
                fontFamily:"JetBrains Mono,monospace", fontSize:14, width:"100%",
              }}/>
          </div>
          <button className="btn" style={{flexShrink:0}}
            onClick={generate} disabled={loading||selected.length<2}>
            {loading?"Generating...":"Generate Portfolio"}
          </button>
        </div>
      </div>

      {result && (
        <div className="fade-in">
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontSize:12, fontWeight:700, color:T.teal, marginBottom:12, letterSpacing:0.5}}>
              RECOMMENDED ALLOCATION
            </div>
            <div className="alloc-header">
              <span>Asset</span><span>Wt.</span><span>Amount</span>
              <span>Signal</span><span className="conf-col">Conf.</span>
            </div>
            {result.allocs.map((a,i)=>(
              <div key={i} className="alloc-row">
                <span style={{fontWeight:700, color:T.white}}>{a.symbol}</span>
                <span className="mono" style={{color:T.teal}}>{a.weight}%</span>
                <span className="mono" style={{color:T.white, fontSize:11}}>₹{fmt(a.amount)}</span>
                <span className="sig-badge" style={{
                  background:SIG_COLOR[a.signal]?.bg||T.dim,
                  color:SIG_COLOR[a.signal]?.text||T.white,
                  fontSize:10, padding:"3px 0", width:60,
                }}>{a.signal}</span>
                <span className="mono conf-col" style={{color:T.muted, fontSize:11}}>
                  {a.confidence?`${a.confidence}%`:"—"}
                </span>
              </div>
            ))}
            <div style={{marginTop:10, padding:"8px 12px", background:T.raised,
              borderRadius:8, fontSize:11, color:T.muted}}>
              Total: ₹{fmt(result.capital)} · {result.allocs.filter(a=>a.signal==="BUY").length} BUY
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:12, fontWeight:700, color:T.teal, marginBottom:12}}>
              BREAKDOWN
            </div>
            <ResponsiveContainer width="100%" height={isMobile?180:220}>
              <PieChart>
                <Pie data={result.allocs.filter(a=>a.weight>0)}
                  dataKey="weight" nameKey="symbol"
                  cx="50%" cy="50%" outerRadius={isMobile?70:85}
                  label={({symbol,weight})=>`${symbol} ${weight}%`}
                  labelLine={false}>
                  {result.allocs.filter(a=>a.weight>0).map((_,i)=>(
                    <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{background:T.raised, border:`1px solid ${T.border}`,
                  borderRadius:8, color:T.white, fontSize:11}}
                  formatter={(v,n)=>[`${v}%`,n]}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Backtest Page ────────────────────────────────────────
function BacktestPage({ isMobile }) {
  const [selected, setSelected] = useState("RELIANCE");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const run = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const r = await axios.get(`${API}/backtest/${selected}`);
      setResult(r.data);
    } catch(e) { setError(e.response?.data?.detail||"Backtest failed"); }
    setLoading(false);
  };

  const NSE_STOCKS = STOCKS.filter(s=>!["GOLD24K","SILVER","GOLDBEES","SILVERBEES","NIFTYBEES"].includes(s));

  return (
    <div className="fade-in">
      <h1 className="page-title">Backtest Engine</h1>
      <p className="page-sub">2-year strategy vs Nifty50 · 0.1% commission included.</p>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:11, color:T.muted, letterSpacing:0.8, marginBottom:10, fontWeight:700}}>
          SELECT STOCK
        </div>
        <div className="stocks-scroll" style={{marginBottom:14}}>
          {NSE_STOCKS.map(s=>(
            <button key={s} className={`stock-btn ${selected===s?"active":""}`}
              onClick={()=>setSelected(s)}>{s}</button>
          ))}
        </div>
        <button className="btn" onClick={run} disabled={loading}>
          {loading?"⏳ Running simulation...":"▶ Run Backtest"}
        </button>
      </div>

      {error && (
        <div style={{padding:14, background:"rgba(242,92,84,0.08)",
          border:`1px solid ${T.danger}`, borderRadius:10,
          color:T.danger, fontSize:13, marginBottom:14}}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="fade-in">
          <div className="grid-4" style={{marginBottom:12}}>
            {[
              {label:"Total Return",  value:`${result.total_return}%`, color:result.total_return>0?T.teal:T.danger},
              {label:"Sharpe Ratio",  value:result.sharpe_ratio,       color:T.teal},
              {label:"Max Drawdown",  value:`${result.max_drawdown}%`, color:T.danger},
              {label:"Win Rate",      value:`${result.win_rate}%`,     color:T.teal},
            ].map(m=>(
              <div key={m.label} className="metric-card">
                <div className="metric-value" style={{color:m.color}}>{m.value}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{fontSize:11, color:T.muted, marginBottom:12}}>
              Portfolio vs Nifty50 ·
              <span style={{color:T.teal}}> ₹{fmt(result.initial_cash)}</span> →
              <span style={{color:T.teal, fontWeight:700}}> ₹{fmt(result.final_value)}</span>
              <span style={{color:T.muted}}> · {result.total_trades} trades</span>
            </div>
            <ResponsiveContainer width="100%" height={isMobile?200:260}>
              <AreaChart>
                <defs>
                  <linearGradient id="tmg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.teal} stopOpacity={0.12}/>
                    <stop offset="95%" stopColor={T.teal} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="date" tick={{fill:T.muted, fontSize:8}}
                  tickFormatter={v=>v.slice(2,7)} interval={isMobile?45:30}
                  allowDuplicatedCategory={false}/>
                <YAxis tick={{fill:T.muted, fontSize:8}}
                  tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} width={42}/>
                <Tooltip contentStyle={{background:T.raised, border:`1px solid ${T.border}`,
                  borderRadius:8, color:T.white, fontSize:11}}
                  formatter={(v,n)=>[`₹${fmt(v)}`,n]}/>
                <Area data={result.portfolio_curve} type="monotone"
                  dataKey="value" stroke={T.teal} strokeWidth={2}
                  fill="url(#tmg)" dot={false} name="TradeMind"/>
                <Area data={result.benchmark} type="monotone"
                  dataKey="value" stroke={T.muted} strokeWidth={1.5}
                  fill="none" dot={false} name="Nifty50" strokeDasharray="4 4"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Commodities Page ─────────────────────────────────────
function CommoditiesPage({ isMobile }) {
  const [gold,    setGold]    = useState(null);
  const [sigG,    setSigG]    = useState(null);
  const [sigS,    setSigS]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/gold`).then(r=>setGold(r.data)).catch(()=>{}),
      axios.get(`${API}/signal/GOLD24K`).then(r=>setSigG(r.data)).catch(()=>{}),
      axios.get(`${API}/signal/SILVER`).then(r=>setSigS(r.data)).catch(()=>{}),
    ]).finally(()=>setLoading(false));
  },[]);

  return (
    <div className="fade-in">
      <h1 className="page-title">Commodities</h1>
      <p className="page-sub">Live Gold 24K + Silver prices with AI signals — INR converted.</p>

      {loading && <div style={{color:T.muted, padding:40, textAlign:"center"}}>Loading...</div>}

      {gold && (
        <div className="card" style={{marginBottom:12, borderColor:T.gold}}>
          <div style={{display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:12}}>
            <div>
              <div style={{fontSize:10, color:T.gold, fontWeight:700, letterSpacing:1, marginBottom:3}}>
                🥇 GOLD 24K · MCX INDIA
              </div>
              <div className="mono" style={{fontSize:isMobile?24:32, fontWeight:800, color:T.gold}}>
                ₹{fmt(gold.current_price_10g)}
              </div>
              <div style={{fontSize:10, color:T.muted, marginTop:3}}>
                Per 10g · Incl. 15% duty + 3% GST
              </div>
            </div>
            {sigG && (
              <div style={{textAlign:"right"}}>
                <span className="sig-badge" style={{
                  background:SIG_COLOR[sigG.signal]?.bg,
                  color:SIG_COLOR[sigG.signal]?.text,
                }}>{sigG.signal}</span>
                <div style={{fontSize:11, color:T.muted, marginTop:4}}>
                  {parseConf(sigG.confidence)}% conf.
                </div>
              </div>
            )}
          </div>
          {gold.history?.length>0 && (
            <ResponsiveContainer width="100%" height={isMobile?160:200}>
              <AreaChart data={gold.history}>
                <defs>
                  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.gold} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={T.gold} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="Date" tick={{fill:T.muted, fontSize:9}}
                  tickFormatter={v=>v.slice(5)} interval={isMobile?20:14}/>
                <YAxis tick={{fill:T.muted, fontSize:9}}
                  tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} width={42}/>
                <Tooltip contentStyle={{background:T.raised, border:`1px solid ${T.gold}`,
                  borderRadius:8, color:T.white, fontSize:11}}
                  formatter={v=>[`₹${fmt(v)}`,"10g Price"]}/>
                <Area type="monotone" dataKey="Close" stroke={T.gold}
                  strokeWidth={2} fill="url(#gg)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {sigG?.reasons && (
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:12, fontWeight:700, color:T.gold, marginBottom:10}}>
            🤖 GOLD SIGNAL REASONING
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:7}}>
            {sigG.reasons.map((r,i)=>(
              <div key={i} className="reason-item" style={{borderLeftColor:T.gold}}>{r}</div>
            ))}
          </div>
        </div>
      )}

      {sigS && (
        <div className="card">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, marginBottom:3}}>
                🥈 SILVER · MCX INDIA
              </div>
              <div className="mono" style={{fontSize:isMobile?18:22, fontWeight:700, color:T.white}}>
                {sigS.price}
              </div>
            </div>
            <span className="sig-badge" style={{
              background:SIG_COLOR[sigS.signal]?.bg,
              color:SIG_COLOR[sigS.signal]?.text,
            }}>{sigS.signal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────
export default function App() {
  const isMobile  = useIsMobile();
  const [page,      setPage]      = useState("dashboard");
  const [initStock, setInitStock] = useState(null);
  const [gold,      setGold]      = useState(null);
  const { isAuthenticated, loading: authLoading, user, signOut } = useAuth();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    axios.get(`${API}/gold`).then(r=>setGold(r.data)).catch(()=>{});
  }, []);

  const navigate = (p, stock) => {
    setPage(p);
    if(stock) setInitStock(stock);
    window.scrollTo(0, 0);
  };

  // Wait for the initial session check (localStorage lookup) before
  // deciding whether to show the app or the sign-in page — without this,
  // a logged-in user briefly flashes the sign-in page on every refresh.
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: T.bg, color: T.muted,
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const pages = {
    dashboard:   <Dashboard   onNav={navigate} gold={gold} isMobile={isMobile}/>,
    analyse:     <AnalysePage initialStock={initStock} isMobile={isMobile}/>,
    portfolio:   <PortfolioPage isMobile={isMobile}/>,
    backtest:    <BacktestPage isMobile={isMobile}/>,
    commodities: <CommoditiesPage isMobile={isMobile}/>,
    screener:    <ScreenerPage isMobile={isMobile}/>,
    whatsapp:    <WhatsAppSubscribePage isMobile={isMobile}/>,
  };

  const sidebarW = isMobile ? 0 : 60;

  return (
    <>
      <TopBar gold={gold} isMobile={isMobile}/>
      <div style={{
        position: "fixed", top: 12, right: 16, zIndex: 200,
        display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
      }}>
        <span style={{ color: T.muted }}>{user?.email}</span>
        <button
          onClick={signOut}
          style={{
            background: "transparent", color: T.teal, border: `1px solid ${T.tealDim}`,
            borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
      {!isMobile && (
        <Sidebar active={page} onNav={p=>{setPage(p); setInitStock(null);}}/>
      )}
      {isMobile && (
        <BottomNav active={page} onNav={p=>{setPage(p); setInitStock(null);}}/>
      )}
      <main style={{
        marginLeft: sidebarW,
        marginTop: 52,
        padding: isMobile ? "16px 14px 80px" : "24px 28px 32px",
        minHeight: "calc(100vh - 52px)",
        maxWidth: isMobile ? "100%" : `calc(960px + ${sidebarW}px)`,
      }}>
        {pages[page]}
      </main>
    </>
  );
}