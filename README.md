# Polymarket AI Trading Agent `v1.1.1`

An autonomous prediction market trading agent for [Polymarket](https://polymarket.com) powered by Google Gemini. The agent discovers markets, analyzes them using a configurable AI directive, and executes trades — all gasless via Polymarket's order relayer.

---

## Features

### Autonomous Trading
- Fetches live markets from the Gamma API, sorted by volume
- Auto-rotates through all active markets each cycle, or targets a single market manually
- Executes BUY/SELL orders via the Polymarket CLOB — no gas fees (signed off-chain, relayed by Polymarket)
- Stops automatically when the cumulative spend limit is reached

### AI Reasoning
- **Multi-Provider Support**: Choose between Google Gemini, Anthropic Claude, OpenAI, Grok (xAI), or OpenRouter.
- Free-text **Agent Directive** — write any instruction: focus area, confidence thresholds, strategy, risk posture
- Full reasoning trace visible in the live feed for every decision

### Balance & Portfolio Tracking
- Live USDC balance fetched from Polygon (USDC.e) for live accounts
- Demo mode with configurable starting balance (default $1,000)
- Session P&L shown in real time
- Transaction history with **Expected Return**, **Max Loss**, and **EV** per trade
- Aggregate EV across the session

### Risk Controls
- **Max Trade Budget** — caps total cumulative spend; agent stops when the limit is hit
- **Aggressiveness** slider — controls trade size and confidence threshold
- **Risk Tolerance** — Low / Medium / High filters
- **Panic button** — stops agent and cancels all open CLOB orders instantly
- **Reset Experiment** — restores demo balance, clears trade history and reasoning log

### Demo Mode
- All decisions logged but no real orders placed
- Configurable starting balance for backtesting strategies
- Full EV/expectancy tracking identical to live mode

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js v18+ | v20+ recommended |
| AI API Keys | Gemini (Required), OpenAI, Anthropic, xAI, OpenRouter (Optional) |
| Polygon private key | Burner wallet strongly recommended for live trading |

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and complete the one-time setup wizard. Credentials are saved to `localStorage` so you won't need to re-enter them on refresh.

---

## AI Models

The agent supports the following flagship models (selectable at runtime):

| Provider | Notable Models |
|---|---|
| **Google** | `gemini-3.1-pro-preview`, `gemini-3-flash-preview` |
| **Anthropic** | `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest` |
| **OpenAI** | `gpt-4o`, `o1-preview`, `o3-mini` |
| **Grok (xAI)** | `grok-2-1212`, `grok-2-mini` |
| **OpenRouter** | Any model via `provider/model` (e.g., `meta-llama/llama-3.1-405b`) |

> **Note:** Only Gemini is required. Adding other keys in the setup wizard enables those specific models.

---

## Project Structure

```
src/
├── services/
│   ├── polymarket/
│   │   ├── gamma.ts       # Market discovery (Gamma API)
│   │   ├── clob.ts        # Order execution (CLOB API, cached auth)
│   │   └── portfolio.ts   # Balance, transactions, EV calculations
│   └── ai/
│       └── reasoning.ts   # Gemini prompt + response validation
├── components/
│   ├── dashboard/
│   │   ├── MarketCard.tsx
│   │   ├── BrainFeed.tsx
│   │   ├── BalanceWidget.tsx
│   │   ├── TuningPanel.tsx
│   │   └── TransactionHistory.tsx
│   └── onboarding/
│       └── OnboardingWizard.tsx
└── App.tsx
```

---

## How EV Is Calculated

For each trade the agent takes:

- **Expected Return** — profit if the trade resolves correctly (`size × (1 − price)` for BUY)
- **Max Loss** — cost if wrong (`size × price` for BUY)
- **EV** — `(confidence% × expectedReturn) − ((1 − confidence%) × maxLoss)`

A positive EV means the AI believes the bet is mathematically sound given its confidence estimate.

---

## Disclaimer

Prediction markets carry significant financial risk. This tool is for research and automation purposes only — not financial advice. Always start in Demo mode. Use a dedicated burner wallet with limited funds for live trading.
