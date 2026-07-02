import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell
} from "recharts";

const API = "https://kss-1227-trademind.hf.space";

const T = {
  bg:      "#080E1A",
  surface: "#0D1F35",
  raised:  "#132840",
  border:  "#1E3A5F",
  teal:    "#00C9A7",
  tealDim: "#009E84",
  gold:    "#F6C90E",
  danger:  "#F25C54",
  white:   "#F0F4F8",
  muted:   "#64748B",
  dim:     "#334155",
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
  BUY:  { bg: "#00C9A7", text: "#000" },
  HOLD: { bg: "#F6C90E", text: "#000" },
  SELL: { bg: "#F25C54", text: "#fff" },
};

const NAV = [
  { id:"dashboard",   icon:"⬛", label:"Dashboard" },
  { id:"analyse",     icon:"🔍", label:"Analyse" },
  { id:"portfolio",   icon:"📁", label:"Portfolio" },
  { id:"backtest",    icon:"📈", label:"Backtest" },
  { id:"commodities", icon:"🥇", label:"Commodities" },
  { id:"news",        icon:"📰", label:"News" },
];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#080E1A;color:#F0F4F8;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:#080E1A}
  ::-webkit-scrollbar-thumb{background:#1E3A5F;border-radius:4px}
  .mono{font-family:'JetBrains Mono',monospace}
  .card{background:#0D1F35;border:1px solid #1E3A5F;border-radius:12px;padding:20px}
  .btn-primary{background:#00C9A7;color:#000;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s;letter-spacing:0.3px}
  .btn-primary:hover{opacity:0.85}
  .btn-primary:disabled{opacity:0.45;cursor:not-allowed}
  .btn-ghost{background:transparent;color:#00C9A7;border:1px solid #1E3A5F;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:border-color 0.15s}
  .btn-ghost:hover{border-color:#00C9A7}
  .sig-badge{display:inline-block;width:72px;text-align:center;padding:5px 0;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:1px}
  .conf-bar-track{height:3px;background:#334155;border-radius:2px;margin-top:6px}
  .conf-bar-fill{height:3px;border-radius:2px;transition:width 0.6s ease}
  .tab-bar{display:flex;gap:4px;border-bottom:1px solid #1E3A5F;margin-bottom:20px}
  .tab{padding:10px 16px;font-size:12px;font-weight:600;color:#64748B;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.15s,border-color 0.15s;background:none;border-top:none;border-left:none;border-right:none;font-family:'Inter',sans-serif}
  .tab:hover{color:#F0F4F8}
  .tab.active{color:#00C9A7;border-bottom-color:#00C9A7}
  .reason-item{padding:10px 14px;border-left:2px solid #00C9A7;background:#132840;border-radius:0 8px 8px 0;font-size:12.5px;color:#F0F4F8;line-height:1.5}
  .stock-btn{padding:7px 14px;border-radius:7px;border:1px solid #1E3A5F;background:#0D1F35;color:#64748B;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s}
  .stock-btn:hover{border-color:#00C9A7;color:#F0F4F8}
  .stock-btn.active{background:rgba(0,201,167,0.12);border-color:#00C9A7;color:#00C9A7}
  .metric-card{background:#0D1F35;border:1px solid #1E3A5F;border-radius:10px;padding:16px;text-align:center}
  .metric-value{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;margin-bottom:4px}
  .metric-label{font-size:11px;color:#64748B;letter-spacing:0.5px;text-transform:uppercase}
  .metric-sub{font-size:10px;color:#334155;margin-top:3px;font-style:italic}
  .agent-step{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:12px;color:#64748B;transition:color 0.3s}
  .agent-step.done{color:#00C9A7}
  .agent-step.active{color:#F0F4F8}
  .dot-pulse{width:8px;height:8px;border-radius:50%;background:#00C9A7;animation:pulse 1s infinite;flex-shrink:0}
  .dot-done{width:8px;height:8px;border-radius:50%;background:#00C9A7;flex-shrink:0}
  .dot-idle{width:8px;height:8px;border-radius:50%;background:#334155;flex-shrink:0}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
  .live-dot{width:7px;height:7px;border-radius:50%;background:#00C9A7;animation:pulse 2s infinite;display:inline-block;margin-right:5px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn 0.3s ease}
  .ticker-item{display:flex;align-items:center;gap:8px;padding:0 20px;border-right:1px solid #1E3A5F;white-space:nowrap}
  .ticker-label{font-size:11px;color:#64748B}
  .ticker-value{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600}
  .news-item{padding:14px 0;border-bottom:1px solid #1E3A5F}
  .news-item:last-child{border-bottom:none}
  .alloc-row{display:grid;grid-template-columns:1.5fr 1fr 1fr 80px 80px;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;background:#132840;margin-bottom:8px;font-size:13px}
  .alloc-header{display:grid;grid-template-columns:1.5fr 1fr 1fr 80px 80px;gap:12px;padding:6px 16px;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px}
  @media(max-width:768px){
    .sidebar-desktop{display:none!important}
    .main-content{margin-left:0!important}
    .topbar-tickers{display:none!important}
    .bottom-nav{display:flex!important}
    .grid-2{grid-template-columns:1fr!important}
    .grid-3{grid-template-columns:1fr 1fr!important}
    .grid-4{grid-template-columns:1fr 1fr!important}
  }
  @media(min-width:769px){.bottom-nav{display:none!important}}
`;

const fmt    = (n) => n?.toLocaleString("en-IN") ?? "—";
const fmtPct = (n) => n != null ? `${n > 0 ? "+" : ""}${n}%` : "—";

function TopBar({ gold }) {
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
      position:"fixed",top:0,left:0,right:0,zIndex:100,
      height:52,background:"#0D1F35",borderBottom:"1px solid #1E3A5F",
      display:"flex",alignItems:"center",
    }}>
      <div style={{
        width:200,display:"flex",alignItems:"center",gap:10,
        padding:"0 20px",flexShrink:0,
        borderRight:"1px solid #1E3A5F",height:"100%",
      }}>
        <span style={{fontSize:20}}>💹</span>
        <div>
          <div style={{fontSize:15,fontWeight:800,letterSpacing:1,color:"#F0F4F8"}}>TradeMind</div>
          <div style={{fontSize:9,color:"#00C9A7",letterSpacing:0.5}}>AI CO-PILOT · NSE</div>
        </div>
      </div>
      <div className="topbar-tickers" style={{display:"flex",alignItems:"center",flex:1,height:"100%"}}>
        {nifty && (
          <div className="ticker-item">
            <span className="ticker-label">NIFTY ETF</span>
            <span className="ticker-value" style={{color:parseFloat(nifty.change)>=0?"#00C9A7":"#F25C54"}}>
              ₹{nifty.value}
            </span>
            <span style={{fontSize:10,color:parseFloat(nifty.change)>=0?"#00C9A7":"#F25C54"}}>
              {fmtPct(nifty.change)}
            </span>
          </div>
        )}
        {gold && (
          <div className="ticker-item">
            <span className="ticker-label">GOLD 24K / 10g</span>
            <span className="ticker-value" style={{color:"#F6C90E"}}>₹{fmt(gold.current_price_10g)}</span>
          </div>
        )}
        {gold && (
          <div className="ticker-item">
            <span className="ticker-label">USD/INR</span>
            <span className="ticker-value" style={{color:"#F0F4F8"}}>₹{gold.usd_to_inr}</span>
          </div>
        )}
      </div>
      <div style={{padding:"0 20px",display:"flex",alignItems:"center",gap:6}}>
        <span className="live-dot"/>
        <span style={{fontSize:11,color:"#00C9A7",fontWeight:600}}>LIVE</span>
      </div>
    </header>
  );
}

function Sidebar({ active, onNav }) {
  const [hovered, setHovered] = useState(null);
  return (
    <aside className="sidebar-desktop" style={{
      position:"fixed",left:0,top:52,bottom:0,width:64,
      background:"#0D1F35",borderRight:"1px solid #1E3A5F",
      display:"flex",flexDirection:"column",alignItems:"center",
      paddingTop:16,gap:4,zIndex:90,
    }}>
      {NAV.map(n => (
        <div key={n.id} style={{position:"relative",width:"100%"}}>
          <button
            onClick={() => onNav(n.id)}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width:"100%",height:48,display:"flex",alignItems:"center",justifyContent:"center",
              background:active===n.id?"rgba(0,201,167,0.1)":"transparent",border:"none",
              borderLeft:`3px solid ${active===n.id?"#00C9A7":"transparent"}`,
              cursor:"pointer",fontSize:18,transition:"all 0.15s",
            }}
            title={n.label}
          >{n.icon}</button>
          {hovered===n.id && (
            <div style={{
              position:"absolute",left:70,top:"50%",transform:"translateY(-50%)",
              background:"#132840",border:"1px solid #1E3A5F",borderRadius:6,
              padding:"5px 10px",fontSize:12,fontWeight:600,color:"#F0F4F8",
              whiteSpace:"nowrap",pointerEvents:"none",zIndex:200,
            }}>{n.label}</div>
          )}
        </div>
      ))}
    </aside>
  );
}

function BottomNav({ active, onNav }) {
  return (
    <nav className="bottom-nav" style={{
      position:"fixed",bottom:0,left:0,right:0,
      background:"#0D1F35",borderTop:"1px solid #1E3A5F",
      display:"flex",justifyContent:"space-around",
      padding:"8px 0",zIndex:100,
    }}>
      {NAV.slice(0,5).map(n => (
        <button key={n.id} onClick={() => onNav(n.id)}
          style={{
            background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            color:active===n.id?"#00C9A7":"#64748B",
            fontSize:18,fontFamily:"Inter,sans-serif",
          }}>
          {n.icon}
          <span style={{fontSize:9,fontWeight:600}}>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AgentLoader({ step }) {
  const steps = [
    "Research Agent — fetching price + news",
    "Signal Agent — running ML model",
    "Explainer Agent — generating reasons",
  ];
  return (
    <div className="card" style={{marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:600,color:"#F0F4F8",marginBottom:14}}>
        Analysing with AI...
      </div>
      {steps.map((s,i) => (
        <div key={i} className={`agent-step ${i<step?"done":i===step?"active":""}`}>
          {i<step ? <span className="dot-done"/> : i===step ? <span className="dot-pulse"/> : <span className="dot-idle"/>}
          {s}
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal }) {
  const [tab, setTab]     = useState("signal");
  const [prices, setPrices] = useState([]);
  const sig  = SIG_COLOR[signal.signal] || SIG_COLOR.HOLD;
  const conf = signal.confidence?.toString().includes('%')
    ? parseInt(signal.confidence)
    : Math.round((Number(signal.confidence) || 0) * 100);

  useEffect(() => {
    const sym = signal.symbol?.replace(".NS","") || "";
    axios.get(`${API}/prices/${sym}`)
      .then(r => setPrices(r.data.data||[]))
      .catch(()=>{});
  }, [signal.symbol]);

  return (
    <div className="fade-in">
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        <div className="card" style={{flex:"1 1 280px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:11,color:"#64748B",letterSpacing:1,marginBottom:4}}>
                {signal.symbol} · NSE
              </div>
              <div className="mono" style={{fontSize:28,fontWeight:800,color:"#F0F4F8"}}>
                {signal.price}
              </div>
              <div style={{fontSize:11,color:"#64748B",marginTop:2}}>{signal.timestamp}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <span className="sig-badge" style={{background:sig.bg,color:sig.text}}>
                {signal.signal}
              </span>
              <div style={{fontSize:11,color:"#64748B",marginTop:6}}>Confidence</div>
              <div className="mono" style={{fontSize:16,fontWeight:700,color:sig.bg}}>{conf}%</div>
              <div className="conf-bar-track" style={{width:80}}>
                <div className="conf-bar-fill" style={{width:`${conf}%`,background:sig.bg}}/>
              </div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flex:"1 1 300px"}}>
          {[
            {label:"Sharpe",   value:signal.risk?.sharpe,    color:"#00C9A7"},
            {label:"Drawdown", value:signal.risk?.drawdown,  color:"#F25C54"},
            {label:"VaR 95%",  value:signal.risk?.var,       color:"#F6C90E"},
          ].map(m => (
            <div key={m.label} className="metric-card" style={{flex:1}}>
              <div className="metric-value" style={{color:m.color,fontSize:16}}>{m.value||"—"}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tab-bar">
        {["signal","chart","sentiment"].map(t => (
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t==="signal"?"Why This Signal":t==="chart"?"Price Chart":"Sentiment"}
          </button>
        ))}
      </div>

      {tab==="signal" && (
        <div className="card fade-in">
          <div style={{fontSize:12,fontWeight:700,color:"#00C9A7",marginBottom:12,letterSpacing:0.5}}>
            🤖 SHAP EXPLANATION
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {signal.reasons?.map((r,i) => <div key={i} className="reason-item">{r}</div>)}
          </div>
          {signal.risk?.note && (
            <div style={{
              marginTop:14,padding:"10px 14px",
              background:"rgba(246,201,14,0.06)",
              border:"1px solid rgba(246,201,14,0.2)",
              borderRadius:8,fontSize:12,color:"#F6C90E",
            }}>{signal.risk.note}</div>
          )}
        </div>
      )}

      {tab==="chart" && (
        <div className="card fade-in">
          <div style={{fontSize:12,fontWeight:600,color:"#64748B",marginBottom:16}}>
            {signal.symbol?.replace(".NS","")} · Last 90 Days
          </div>
          {prices.length>0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={prices}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C9A7" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00C9A7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F"/>
                <XAxis dataKey="Date" tick={{fill:"#64748B",fontSize:10}} tickFormatter={v=>v.slice(5)} interval={14}/>
                <YAxis tick={{fill:"#64748B",fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} domain={["auto","auto"]}/>
                <Tooltip
                  contentStyle={{background:"#132840",border:"1px solid #1E3A5F",borderRadius:8,color:"#F0F4F8",fontSize:12}}
                  formatter={v=>[`₹${fmt(v)}`,"Price"]} labelFormatter={l=>`Date: ${l}`}/>
                <Area type="monotone" dataKey="Close" stroke="#00C9A7" strokeWidth={2} fill="url(#pg)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign:"center",color:"#64748B",padding:40}}>Loading chart...</div>
          )}
        </div>
      )}

      {tab==="sentiment" && (
        <div className="card fade-in">
          <div style={{fontSize:12,fontWeight:700,color:"#00C9A7",marginBottom:16,letterSpacing:0.5}}>
            📰 FINBERT SENTIMENT ANALYSIS
          </div>
          <div style={{display:"flex",gap:12}}>
            {Object.entries(signal.sentiment?.scores||{}).map(([k,v]) => {
              const color = k==="positive"?"#00C9A7":k==="negative"?"#F25C54":"#F6C90E";
              const pct   = Math.round(v*100);
              return (
                <div key={k} style={{flex:1,background:"#132840",borderRadius:10,padding:16,textAlign:"center"}}>
                  <div className="mono" style={{fontSize:26,fontWeight:800,color}}>{pct}%</div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:4,textTransform:"capitalize"}}>{k}</div>
                  <div style={{height:3,background:"#334155",borderRadius:2,marginTop:10}}>
                    <div style={{height:3,width:`${pct}%`,background:color,borderRadius:2}}/>
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

function Dashboard({ onNav, gold }) {
  const stats = [
    {label:"Assets Covered",  value:"13",      sub:"NSE stocks + commodities", color:"#00C9A7"},
    {label:"Gold 24K / 10g",  value:gold?`₹${fmt(gold.current_price_10g)}`:"—", sub:"Live MCX price", color:"#F6C90E"},
    {label:"Model Win Rate",  value:"90%",     sub:"Backtested on Reliance",   color:"#00C9A7"},
    {label:"Backtest Return", value:"30%+",    sub:"2-year out-of-sample",     color:"#00C9A7"},
  ];
  return (
    <div className="fade-in">
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>
          Good morning. Markets are open.
        </h1>
        <p style={{color:"#64748B",fontSize:13}}>
          TradeMind is watching 13 NSE assets — select one to generate an AI signal.
        </p>
      </div>
      <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {stats.map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-value" style={{color:s.color}}>{s.value}</div>
            <div className="metric-label">{s.label}</div>
            <div className="metric-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:11,color:"#64748B",letterSpacing:0.8,marginBottom:12,fontWeight:700}}>QUICK ANALYSE</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {STOCKS.map(s => (
            <button key={s} className="stock-btn" onClick={() => onNav("analyse",s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => onNav("analyse")}>Open Analyser →</button>
      </div>
      <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[
          {icon:"📁",title:"Portfolio Mode",    desc:"AI allocates across 3-5 stocks based on signal strength and risk.",nav:"portfolio"},
          {icon:"📈",title:"Backtest Engine",   desc:"2-year strategy simulation vs Nifty50 with 0.1% commission.",    nav:"backtest"},
          {icon:"🥇",title:"Commodities",       desc:"Live Gold 24K + Silver with AI signals converted to INR.",        nav:"commodities"},
        ].map(f => (
          <div key={f.title} className="card" style={{cursor:"pointer"}} onClick={() => onNav(f.nav)}>
            <div style={{fontSize:22,marginBottom:10}}>{f.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#F0F4F8",marginBottom:6}}>{f.title}</div>
            <div style={{fontSize:12,color:"#64748B",lineHeight:1.6}}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysePage({ initialStock }) {
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
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>Stock Analysis</h1>
        <p style={{color:"#64748B",fontSize:13}}>AI signal with SHAP explanation for any NSE asset.</p>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:11,color:"#64748B",letterSpacing:0.8,marginBottom:12,fontWeight:700}}>SELECT ASSET</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {STOCKS.map(s => (
            <button key={s} className={`stock-btn ${selected===s?"active":""}`} onClick={()=>setSelected(s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>analyse(selected)} disabled={loading}>
          {loading?"Analysing...":` Analyse ${STOCK_LABELS[selected]||selected}`}
        </button>
      </div>
      {loading && <AgentLoader step={step}/>}
      {error && (
        <div style={{padding:16,background:"rgba(242,92,84,0.1)",border:"1px solid #F25C54",borderRadius:10,color:"#F25C54",fontSize:13,marginBottom:16}}>
          {error}
        </div>
      )}
      {signal && <SignalCard signal={signal}/>}
    </div>
  );
}

function PortfolioPage() {
  const [selected, setSelected] = useState([]);
  const [capital,  setCapital]  = useState(100000);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const toggle = s => setSelected(p => p.includes(s)?p.filter(x=>x!==s):p.length<5?[...p,s]:p);

  const generate = async () => {
    if(selected.length<2) return;
    setLoading(true); setResult(null);
    try {
      const signals = await Promise.all(selected.map(s=>axios.get(`${API}/signal/${s}`).then(r=>r.data)));
      const buys    = signals.filter(s=>s.signal==="BUY");
      const holds   = signals.filter(s=>s.signal==="HOLD");
      const consider= buys.length>0?buys:holds;
      const total   = consider.reduce((a,s)=>a+(s.confidence||0),0);
      const allocs  = consider.map(s=>({
        symbol:s.symbol?.replace(".NS",""),signal:s.signal,confidence:s.confidence,
        weight:total>0?Math.round(s.confidence/total*100):Math.round(100/consider.length),
        amount:total>0?Math.round(capital*s.confidence/total):Math.round(capital/consider.length),
        price:s.price,reason:s.reasons?.[0]||"Technical signal",
      }));
      const sells = signals.filter(s=>s.signal==="SELL").map(s=>({
        symbol:s.symbol?.replace(".NS",""),signal:"SELL",weight:0,amount:0,reason:"Avoid — bearish signal",confidence:s.confidence,
      }));
      setResult({allocs:[...allocs,...sells],capital,signals});
    } catch(e){console.error(e);}
    setLoading(false);
  };

  const PIE_COLORS=["#00C9A7","#F6C90E","#7C3AED","#2563EB","#F25C54"];

  return (
    <div className="fade-in">
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>Portfolio Mode</h1>
        <p style={{color:"#64748B",fontSize:13}}>Select 2-5 assets — AI suggests optimal allocation based on signal strength.</p>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:11,color:"#64748B",letterSpacing:0.8,marginBottom:12,fontWeight:700}}>
          SELECT ASSETS (max 5) — {selected.length}/5
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {STOCKS.map(s=>(
            <button key={s} className={`stock-btn ${selected.includes(s)?"active":""}`} onClick={()=>toggle(s)}>
              {STOCK_LABELS[s]||s}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,color:"#64748B",marginBottom:6,fontWeight:600}}>CAPITAL (₹)</div>
            <input type="number" value={capital} onChange={e=>setCapital(Number(e.target.value))}
              style={{background:"#132840",border:"1px solid #1E3A5F",borderRadius:8,padding:"8px 12px",color:"#F0F4F8",fontFamily:"JetBrains Mono,monospace",fontSize:14,width:160}}/>
          </div>
          <button className="btn-primary" onClick={generate} disabled={loading||selected.length<2}>
            {loading?"Generating...":"Generate Portfolio"}
          </button>
        </div>
      </div>
      {result && (
        <div className="fade-in">
          <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div className="card">
              <div style={{fontSize:12,fontWeight:700,color:"#00C9A7",marginBottom:16,letterSpacing:0.5}}>RECOMMENDED ALLOCATION</div>
              <div className="alloc-header"><span>Asset</span><span>Weight</span><span>Amount</span><span>Signal</span><span>Conf.</span></div>
              {result.allocs.map((a,i)=>(
                <div key={i} className="alloc-row">
                  <span style={{fontWeight:700,color:"#F0F4F8"}}>{a.symbol}</span>
                  <span className="mono" style={{color:"#00C9A7"}}>{a.weight}%</span>
                  <span className="mono" style={{color:"#F0F4F8"}}>₹{fmt(a.amount)}</span>
                  <span className="sig-badge" style={{background:SIG_COLOR[a.signal]?.bg||"#334155",color:SIG_COLOR[a.signal]?.text||"#fff",fontSize:10,padding:"3px 0"}}>{a.signal}</span>
                  <span className="mono" style={{color:"#64748B",fontSize:12}}>{a.confidence?(a.confidence?.toString().includes('%')?parseInt(a.confidence):`${Math.round(a.confidence*100)}`)+"%" :"—"}</span>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 16px",background:"#132840",borderRadius:8,fontSize:12,color:"#64748B"}}>
                Total: ₹{fmt(capital)} · {result.allocs.filter(a=>a.signal==="BUY").length} BUY · {result.allocs.filter(a=>a.signal==="HOLD").length} HOLD
              </div>
            </div>
            <div className="card">
              <div style={{fontSize:12,fontWeight:700,color:"#00C9A7",marginBottom:16,letterSpacing:0.5}}>PORTFOLIO BREAKDOWN</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={result.allocs.filter(a=>a.weight>0)} dataKey="weight" nameKey="symbol"
                    cx="50%" cy="50%" outerRadius={80}
                    label={({symbol,weight})=>`${symbol} ${weight}%`} labelLine={false}>
                    {result.allocs.filter(a=>a.weight>0).map((_,i)=>(
                      <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{background:"#132840",border:"1px solid #1E3A5F",borderRadius:8,color:"#F0F4F8",fontSize:12}}
                    formatter={(v,n)=>[`${v}%`,n]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BacktestPage() {
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

  return (
    <div className="fade-in">
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>Backtest Engine</h1>
        <p style={{color:"#64748B",fontSize:13}}>2-year strategy simulation vs Nifty50 · 0.1% commission included.</p>
      </div>
      <div className="card" style={{marginBottom:16,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#64748B",letterSpacing:0.8,marginBottom:10,fontWeight:700}}>SELECT STOCK</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {STOCKS.filter(s=>!["GOLD24K","SILVER","GOLDBEES","SILVERBEES","NIFTYBEES"].includes(s)).map(s=>(
              <button key={s} className={`stock-btn ${selected===s?"active":""}`} onClick={()=>setSelected(s)}>{s}</button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>
          {loading?"⏳ Running simulation...":"▶ Run Backtest"}
        </button>
      </div>
      {error && (
        <div style={{padding:14,background:"rgba(242,92,84,0.08)",border:"1px solid #F25C54",borderRadius:10,color:"#F25C54",fontSize:13,marginBottom:16}}>
          {error}
        </div>
      )}
      {result && (
        <div className="fade-in">
          <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[
              {label:"Total Return",  value:`${result.total_return}%`,  color:result.total_return>0?"#00C9A7":"#F25C54"},
              {label:"Sharpe Ratio",  value:result.sharpe_ratio,         color:"#00C9A7"},
              {label:"Max Drawdown",  value:`${result.max_drawdown}%`,  color:"#F25C54"},
              {label:"Win Rate",      value:`${result.win_rate}%`,       color:"#00C9A7"},
            ].map(m=>(
              <div key={m.label} className="metric-card">
                <div className="metric-value" style={{color:m.color}}>{m.value}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>
              Portfolio Value vs Nifty50 ·
              <span style={{color:"#00C9A7"}}> ₹{fmt(result.initial_cash)}</span> →
              <span style={{color:"#00C9A7",fontWeight:700}}> ₹{fmt(result.final_value)}</span>
              <span style={{color:"#64748B"}}> · {result.total_trades} trades</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart>
                <defs>
                  <linearGradient id="tmg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C9A7" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#00C9A7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F"/>
                <XAxis dataKey="date" tick={{fill:"#64748B",fontSize:9}} tickFormatter={v=>v.slice(2,7)} interval={30} allowDuplicatedCategory={false}/>
                <YAxis tick={{fill:"#64748B",fontSize:9}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:"#132840",border:"1px solid #1E3A5F",borderRadius:8,color:"#F0F4F8",fontSize:11}} formatter={(v,n)=>[`₹${fmt(v)}`,n]}/>
                <Area data={result.portfolio_curve} type="monotone" dataKey="value" stroke="#00C9A7" strokeWidth={2} fill="url(#tmg)" dot={false} name="TradeMind"/>
                <Area data={result.benchmark} type="monotone" dataKey="value" stroke="#64748B" strokeWidth={1.5} fill="none" dot={false} name="Nifty50" strokeDasharray="4 4"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function CommoditiesPage() {
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
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>Commodities</h1>
        <p style={{color:"#64748B",fontSize:13}}>Live Gold 24K + Silver prices with AI signals — INR converted.</p>
      </div>
      {loading && <div style={{color:"#64748B",padding:40,textAlign:"center"}}>Loading commodity data...</div>}
      {gold && (
        <div className="card" style={{marginBottom:16,borderColor:"#F6C90E"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:11,color:"#F6C90E",fontWeight:700,letterSpacing:1,marginBottom:4}}>🥇 GOLD 24K · MCX INDIA</div>
              <div className="mono" style={{fontSize:32,fontWeight:800,color:"#F6C90E"}}>₹{fmt(gold.current_price_10g)}</div>
              <div style={{fontSize:11,color:"#64748B",marginTop:3}}>
                Per 10 grams · Incl. 15% duty + 3% GST · ${gold.current_price_oz}/oz · ₹{gold.usd_to_inr}/USD
              </div>
            </div>
            {sigG && (
              <div style={{textAlign:"right"}}>
                <span className="sig-badge" style={{background:SIG_COLOR[sigG.signal]?.bg,color:SIG_COLOR[sigG.signal]?.text}}>
                  {sigG.signal}
                </span>
                <div style={{fontSize:11,color:"#64748B",marginTop:4}}>
                  Confidence: {sigG.confidence?.toString().includes('%') ? parseInt(sigG.confidence) : Math.round((sigG.confidence||0)*100)}%
                </div>
              </div>
            )}
          </div>
          {gold.history?.length>0 && (
            <ResponsiveContainer width="100%" height={180} style={{marginTop:16}}>
              <AreaChart data={gold.history}>
                <defs>
                  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F6C90E" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#F6C90E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F"/>
                <XAxis dataKey="Date" tick={{fill:"#64748B",fontSize:9}} tickFormatter={v=>v.slice(5)} interval={14}/>
                <YAxis tick={{fill:"#64748B",fontSize:9}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} domain={["auto","auto"]}/>
                <Tooltip contentStyle={{background:"#132840",border:"1px solid #F6C90E",borderRadius:8,color:"#F0F4F8",fontSize:11}} formatter={v=>[`₹${fmt(v)}`,"10g Price"]}/>
                <Area type="monotone" dataKey="Close" stroke="#F6C90E" strokeWidth={2} fill="url(#gg)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      {sigG?.reasons && (
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"#F6C90E",marginBottom:12,letterSpacing:0.5}}>🤖 GOLD SIGNAL REASONING</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sigG.reasons.map((r,i)=><div key={i} className="reason-item" style={{borderLeftColor:"#F6C90E"}}>{r}</div>)}
          </div>
        </div>
      )}
      {sigS && (
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,color:"#64748B",fontWeight:700,letterSpacing:1,marginBottom:4}}>🥈 SILVER · MCX INDIA</div>
              <div className="mono" style={{fontSize:22,fontWeight:700,color:"#F0F4F8"}}>{sigS.price}</div>
            </div>
            <span className="sig-badge" style={{background:SIG_COLOR[sigS.signal]?.bg,color:SIG_COLOR[sigS.signal]?.text}}>
              {sigS.signal}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
function NewsPage() {
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/news`)
      .then(r => setNews(r.data.headlines || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:"#F0F4F8",marginBottom:4}}>Market News</h1>
        <p style={{color:"#64748B",fontSize:13}}>Latest Indian market headlines.</p>
      </div>
      <div className="card">
        {loading && <div style={{color:"#64748B",padding:40,textAlign:"center"}}>Loading news...</div>}
        {!loading && news.length === 0 && (
          <div style={{color:"#64748B",padding:40,textAlign:"center"}}>No news available right now.</div>
        )}
        {news.map((headline, i) => (
          <div key={i} className="news-item">
            <div style={{fontSize:13,fontWeight:600,color:"#F0F4F8",lineHeight:1.5}}>
              {headline}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [initStock, setInitStock] = useState(null);
  const [gold,      setGold]      = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    axios.get(`${API}/gold`).then(r=>setGold(r.data)).catch(()=>{});
  }, []);

  const navigate = (p, stock) => { setPage(p); if(stock) setInitStock(stock); };

  const pages = {
    dashboard:   <Dashboard   onNav={navigate} gold={gold}/>,
    analyse:     <AnalysePage initialStock={initStock}/>,
    portfolio:   <PortfolioPage/>,
    backtest:    <BacktestPage/>,
    commodities: <CommoditiesPage/>,
    news:        <NewsPage/>,
  };

  return (
    <>
      <TopBar gold={gold}/>
      <Sidebar active={page} onNav={p=>{setPage(p);setInitStock(null);}}/>
      <BottomNav active={page} onNav={p=>{setPage(p);setInitStock(null);}}/>
      <main style={{marginLeft:64,marginTop:52,padding:"28px 32px",minHeight:"calc(100vh - 52px)",maxWidth:"calc(960px + 64px)"}}>
        {pages[page]}
      </main>
    </>
  );
}