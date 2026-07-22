---
title: TradeMind
emoji: 💹
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
---

# TradeMind

**An explainable AI co-pilot for Indian retail investors.**

TradeMind combines market data, technical indicators, machine-learning signals,
natural-language screening, historical backtesting, market news, and WhatsApp
notifications in one application. The product is designed to make each signal
auditable: users can inspect the underlying indicators and model explanation
instead of receiving an unexplained BUY or SELL label.

> **Disclaimer:** TradeMind is an educational and research tool, not financial
> advice. Market data may be delayed or unavailable, model outputs can be
> wrong, and past performance does not predict future results. Do your own
> research before making any investment decision.

## Highlights

- Explainable BUY, SELL, or HOLD signals for supported NSE-listed instruments
- Technical analysis and ML-assisted signal generation
- Natural-language stock screening with per-condition results
- No-code strategy rules and five-year historical backtests
- Interactive price history, backtest results, and market overview in React
- Natural-language investment questions through an optional LangChain/OpenAI
	tool-calling layer
- Gold and silver price tracking with INR conversion
- Optional WhatsApp alerts through the Twilio API
- FastAPI documentation available through Swagger UI and ReDoc

## Architecture

```text
React frontend (frontend/)
				|
				| HTTP / JSON
				v
FastAPI service (backend/main.py)
				|
				+-- agents/          Signal, research, explanation, and LLM orchestration
				+-- data/            Market prices, news, and enrichment
				+-- ml/              Indicators, models, screening, and backtesting
				+-- notifications/   Subscriptions and Twilio WhatsApp delivery
```

The backend fetches current market data through `yfinance`, prepares features,
and runs the signal pipeline. The random-forest model and scaler are created
on first startup when they are not already present. The frontend is a Create
React App application and communicates with the API over HTTP.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `backend/main.py` | FastAPI application and HTTP endpoints |
| `agents/` | Signal pipeline, research, explanations, and optional LLM agent |
| `data/` | Price and news retrieval plus enrichment helpers |
| `ml/` | Technical indicators, models, screening, strategy building, and backtesting |
| `notifications/` | WhatsApp integration and local subscription storage |
| `frontend/src/` | React application, authentication, dashboard, screener, and alerts UI |
| `ml/lstm_model.pt` | Included PyTorch model artifact |
| `data/prices.csv` | Local price data used by the project |
| `startup.py` | Verifies or trains the random-forest model at startup |
| `Dockerfile` | CPU-oriented container build for the API |

## Requirements

- Python 3.12 recommended
- Node.js 18, 19, or 20 and npm 9 or newer
- Internet access for live market and news data
- A Supabase project for frontend authentication
- Optional: OpenAI API key for `/ask`
- Optional: Twilio WhatsApp sandbox or production sender for alerts
- Optional: Firecrawl API key for news enrichment

## Quick Start

### 1. Clone and enter the project

```bash
git clone <your-repository-url>
cd TradeMind
```

### 2. Create the Python environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure the frontend

Create `frontend/.env`:

```dotenv
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase anonymous key is intended for browser use. Do not place service
role keys or other privileged secrets in frontend environment variables.

### 4. Start the services

Start the API from the repository root:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The API is available at
[http://localhost:8000](http://localhost:8000), with interactive documentation
at [http://localhost:8000/docs](http://localhost:8000/docs).

On Windows, `start.bat` starts both development servers. Its current paths are
machine-specific, so update the virtual-environment path if your checkout is
in a different directory.

## Environment Variables

| Variable | Required | Used for |
| --- | --- | --- |
| `REACT_APP_SUPABASE_URL` | Yes | Supabase frontend project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase browser authentication |
| `OPENAI_API_KEY` | Only for `/ask` | LangChain/OpenAI question answering |
| `TWILIO_ACCOUNT_SID` | Only for WhatsApp | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Only for WhatsApp | Twilio authentication |
| `TWILIO_WHATSAPP_FROM` | Optional | WhatsApp sender, defaults to Twilio sandbox sender |
| `FIRECRAWL_API_KEY` | Optional | News enrichment where configured |

Keep backend secrets in the server environment or a local, untracked `.env`
file. Never commit API keys, auth tokens, or Supabase service-role credentials.

## API Reference

The canonical, interactive reference is generated by FastAPI at `/docs` and
`/redoc`. The main routes are:

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Service metadata |
| `GET` | `/health` | Health and model status |
| `GET` | `/stocks` | Supported NSE stocks |
| `GET` | `/signal/{symbol}` | Signal and explanation for one symbol |
| `GET` | `/signals/all` | Signals for the full configured universe |
| `GET` | `/prices/{symbol}` | Three months of closing-price data |
| `GET` | `/backtest/{symbol}` | Five-year model backtest |
| `POST` | `/screener` | Screen stocks from a natural-language query |
| `POST` | `/strategy/backtest` | Backtest a plain-English strategy rule |
| `POST` | `/ask` | Ask a natural-language investment question |
| `GET` | `/news` | Recent Indian market headlines |
| `GET` | `/gold` | Current gold price in INR per 10 grams |
| `POST` | `/whatsapp/subscribe` | Subscribe a phone to symbol alerts |
| `POST` | `/whatsapp/unsubscribe` | Remove an alert subscription |
| `GET` | `/whatsapp/subscriptions` | List current subscriptions |
| `POST` | `/whatsapp/check-alerts` | Evaluate and send current BUY/SELL alerts |

Example requests:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/signal/RELIANCE
curl -X POST http://localhost:8000/screener \
	-H "Content-Type: application/json" \
	-d '{"query":"RSI below 30 and price above 50 day EMA"}'
curl -X POST http://localhost:8000/strategy/backtest \
	-H "Content-Type: application/json" \
	-d '{"symbol":"RELIANCE","query":"buy when RSI below 30 and MACD above signal"}'
```

Symbols may be provided with or without the `.NS` suffix. The service maps
`GOLD24K` and `SILVER` to futures data and converts the result to INR.

## Frontend Development

From `frontend/`:

```bash
npm install
npm start       # development server
npm test        # test runner
npm run build   # production bundle in frontend/build/
```

The frontend expects the API at `http://localhost:8000` during local
development. If your deployment uses a different API origin, update the API
configuration in the frontend source before building.

## Docker

The included Dockerfile builds the backend with CPU-only PyTorch, installs the
Python dependencies, and trains the random-forest model during the image build
when necessary.

```bash
docker build -t trademind-api .
docker run --rm -p 7860:7860 \
	-e OPENAI_API_KEY=your_key \
	-e TWILIO_ACCOUNT_SID=your_sid \
	-e TWILIO_AUTH_TOKEN=your_token \
	trademind-api
```

The container listens on port `7860`. The frontend is deployed separately;
the root `vercel.json` configures the static frontend build for Vercel.

## Deployment Notes

- The `/signals/all` route runs the pipeline for every configured stock and can
	take around two minutes; use it sparingly.
- Signal responses are cached in memory for five minutes. Restarting the API
	clears the cache.
- WhatsApp recipients must first join the configured Twilio WhatsApp sandbox
	when using the sandbox sender.
- WhatsApp subscriptions are stored in `notifications/subscriptions.json`.
	This is suitable for a demo, not a multi-instance production deployment.
- `/whatsapp/subscriptions` currently exposes an admin/debug view without
	phone-number-scoped authentication. Add access control before production use.
- Model training and live data availability depend on the deployment's CPU,
	memory, network access, and upstream provider limits.

## Contributing

1. Create a focused branch for your change.
2. Keep API behavior and response shapes documented when they change.
3. Run the frontend test suite and production build for frontend changes.
4. Run the API locally and exercise the affected endpoint through `/docs`.
5. Keep credentials, generated model files, and local subscription data out of
	 commits unless they are intentionally versioned project assets.

## License

No license file is currently included. Add a license before distributing or
accepting external contributions.