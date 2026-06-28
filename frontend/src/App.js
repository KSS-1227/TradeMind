// src/App.js
import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer, CartesianGrid } from "recharts";

const API = "https://kss-1227-trademind.hf.space";

const STOCKS = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO",
    "ICICIBANK", "BAJFINANCE", "SBIN", "ITC", "ADANIENT",
    "NIFTYBEES", "GOLD24K", "SILVER",
];

const DISPLAY_NAMES = {
    "GOLD24K":   "🥇 GOLD 24K",
    "SILVER":    "🥈 SILVER",
    "NIFTYBEES": "📈 NIFTY50",
};

const signalColor = {
  BUY:  { bg: "#00C9A7", text: "#fff" },
  SELL: { bg: "#F25C54", text: "#fff" },
  HOLD: { bg: "#F6C90E", text: "#000" },
};

// ── Price Chart using Recharts + our own data ──────────────
function PriceChart({ symbol }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`${API}/prices/${symbol}`)
      .then(res => setData(res.data.data))
      .catch(err => console.error(err));
  }, [symbol]);

  return (
    <div style={{ background: "#0D2545", borderRadius: 16,
                  padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700,
                    color: "#00C9A7", marginBottom: 16 }}>
        📈 Price Chart — {symbol} · NSE (Last 90 Days)
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
          <XAxis
            dataKey="Date"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            tickFormatter={v => v.slice(5)}
            interval={14}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            domain={["auto", "auto"]}
            tickFormatter={v => `₹${v}`}
          />
          <Tooltip
            contentStyle={{ background: "#0A1628",
                            border: "1px solid #00C9A7",
                            borderRadius: 8, color: "#fff" }}
            formatter={v => [`₹${v}`, "Close"]}
            labelFormatter={l => `Date: ${l}`}
          />
          <Line
            type="monotone"
            dataKey="Close"
            stroke="#00C9A7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#00C9A7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
// Backtest Component
function BacktestPanel({ symbol }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/backtest/${symbol}`);
      setData(res.data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#0D2545", borderRadius: 16,
                  padding: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#00C9A7" }}>
          📊 Backtest — {symbol} (2 Years)
        </div>
        <button onClick={runBacktest} disabled={loading}
          style={{ padding: "8px 20px", background: "#00C9A7",
                   color: "#000", border: "none", borderRadius: 8,
                   fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                   opacity: loading ? 0.7 : 1 }}>
          {loading ? "⏳ Running..." : "▶ Run Backtest"}
        </button>
      </div>

      {data && (
        <div>
          {/* Metrics */}
          <div style={{ display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
                        marginBottom: 20 }}>
            {[
              { label: "Total Return",  value: `${data.total_return}%`,  color: "#00C9A7" },
              { label: "Sharpe Ratio",  value: data.sharpe_ratio,         color: "#00C9A7" },
              { label: "Max Drawdown",  value: `${data.max_drawdown}%`,  color: "#F25C54" },
              { label: "Win Rate",      value: `${data.win_rate}%`,       color: "#00C9A7" },
            ].map(m => (
              <div key={m.label} style={{ background: "#0A1628",
                                          borderRadius: 10, padding: 14,
                                          textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800,
                              color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 10, color: "#94A3B8",
                              marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Portfolio curve chart */}
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
            Portfolio Value vs Nifty50 Benchmark
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
              <XAxis dataKey="date"
                     tick={{ fill: "#94A3B8", fontSize: 9 }}
                     tickFormatter={v => v.slice(2, 7)}
                     interval={30}
                     allowDuplicatedCategory={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 9 }}
                     tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#0A1628",
                                border: "1px solid #00C9A7",
                                borderRadius: 8, color: "#fff",
                                fontSize: 11 }}
                formatter={(v, name) => [`₹${v.toLocaleString()}`, name]}
              />
              <Line data={data.portfolio_curve}
                    type="monotone" dataKey="value"
                    stroke="#00C9A7" strokeWidth={2}
                    dot={false} name="TradeMind" />
              <Line data={data.benchmark}
                    type="monotone" dataKey="value"
                    stroke="#475569" strokeWidth={1.5}
                    dot={false} name="Nifty50" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>

          {/* Final value */}
          <div style={{ marginTop: 12, fontSize: 12,
                        color: "#94A3B8", textAlign: "center" }}>
            ₹1,00,000 grew to{" "}
            <span style={{ color: "#00C9A7", fontWeight: 700 }}>
              ₹{data.final_value.toLocaleString()}
            </span>
            {" "}over 2 years · {data.total_trades} trades
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState("RELIANCE");
  const [signal,   setSignal]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchSignal = async (symbol) => {
    setLoading(true);
    setError(null);
    setSignal(null);
    try {
      const res = await axios.get(`${API}/signal/${symbol}`);
      setSignal(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch signal");
    }
    setLoading(false);
  };

  const colors = signal ? signalColor[signal.signal] : {};

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0A1628",
                  minHeight: "100vh", color: "#fff", padding: 0 }}>

      {/* Header */}
      <div style={{ background: "#0D2545", padding: "18px 32px",
                    display: "flex", alignItems: "center", gap: 16,
                    borderBottom: "2px solid #00C9A7" }}>
        <span style={{ fontSize: 28 }}>💹</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800,
                        color: "#fff", letterSpacing: 2 }}>
            TRADEMIND
          </div>
          <div style={{ fontSize: 11, color: "#00C9A7" }}>
            AI Co-Pilot for Indian Retail Investors
          </div>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>

        {/* Stock selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "#94A3B8",
                        marginBottom: 10 }}>SELECT NSE STOCK</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {STOCKS.map(s => (
              <button key={s} onClick={() => setSelected(s)}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 13,
                  background: selected === s ? "#00C9A7" : "#0D2545",
                  color: selected === s ? "#000" : "#fff",
                  transition: "all 0.2s"
                }}>
                {DISPLAY_NAMES[s] || s}
              </button>
            ))}
          </div>
        </div>

        {/* Analyse button */}
        <button onClick={() => fetchSignal(selected)}
          disabled={loading}
          style={{
            padding: "14px 40px", background: "#00C9A7",
            color: "#000", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 800, letterSpacing: 1,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 32, opacity: loading ? 0.7 : 1,
          }}>
          {loading ? "⏳ Analysing with AI..." : "🔍 ANALYSE WITH AI"}
        </button>
        {loading && (
          <div style={{ color: "#00C9A7", fontSize: 13,
                        marginTop: -20, marginBottom: 20 }}>
            Running 3 AI agents — Research → Signal → Explain...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#F25C54", padding: 16,
                        borderRadius: 10, marginBottom: 24 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Signal Card */}
        {signal && (
          <div>

            {/* Main signal */}
            <div style={{ background: "#0D2545", borderRadius: 16,
                          padding: 28, marginBottom: 20,
                          border: `2px solid ${colors.bg}` }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#94A3B8",
                                letterSpacing: 2 }}>
                    {signal.symbol} · NSE
                  </div>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
                    {signal.timestamp}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    background: colors.bg, color: colors.text,
                    padding: "10px 28px", borderRadius: 10,
                    fontSize: 26, fontWeight: 900
                  }}>
                    {signal.signal}
                  </div>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>
                    Confidence: {signal.confidence}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #1E3A5F", margin: "20px 0" }} />

              <div style={{ fontSize: 32, fontWeight: 800,
                color: "#fff", marginBottom: 4 }}>
                {signal.price.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>
                Current Market Price
              </div>
            </div>

            {/* Price Chart */}
            <PriceChart symbol={selected} />

            {/* Why this signal */}
            <div style={{ background: "#0D2545", borderRadius: 16,
                          padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700,
                            color: "#00C9A7", marginBottom: 16 }}>
                🤖 Why this signal?
              </div>
              {signal.reasons?.map((r, i) => (
                <div key={i} style={{
                  padding: "10px 14px", background: "#0A1628",
                  borderRadius: 8, marginBottom: 8,
                  fontSize: 13, color: "#F0F4F8",
                  borderLeft: "3px solid #00C9A7"
                }}>
                  {r}
                </div>
              ))}
            </div>

            {/* Risk metrics */}
            <div style={{ background: "#0D2545", borderRadius: 16,
                          padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700,
                            color: "#00C9A7", marginBottom: 16 }}>
                ⚠️ Risk Metrics
              </div>
              <div style={{ display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Sharpe Ratio", value: signal.risk?.sharpe },
                  { label: "Max Drawdown", value: signal.risk?.drawdown },
                  { label: "VaR (95%)",    value: signal.risk?.var },
                ].map(m => (
                  <div key={m.label} style={{
                    background: "#0A1628", borderRadius: 10,
                    padding: 16, textAlign: "center"
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800,
                                  color: "#00C9A7" }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8",
                                  marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12,
                            color: "#94A3B8", fontStyle: "italic" }}>
                {signal.risk?.note}
              </div>
            </div>

            {/* Sentiment */}
            <div style={{ background: "#0D2545", borderRadius: 16,
                          padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700,
                            color: "#00C9A7", marginBottom: 16 }}>
                📰 News Sentiment
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(signal.sentiment?.scores || {}).map(([k, v]) => (
                  <div key={k} style={{
                    flex: 1, background: "#0A1628",
                    borderRadius: 10, padding: 14, textAlign: "center"
                  }}>
                    <div style={{
                      fontSize: 20, fontWeight: 800,
                      color: k === "positive" ? "#00C9A7"
                           : k === "negative" ? "#F25C54" : "#F6C90E"
                    }}>
                      {Math.round(v * 100)}%
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8",
                                  marginTop: 4, textTransform: "capitalize" }}>
                      {k}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Backtest */}
            <BacktestPanel symbol={selected} />

          </div>
        )}
      </div>
    </div>
  );
}