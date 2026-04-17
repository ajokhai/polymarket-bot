# 🤖 Polymarket AI Trading Agent

A premium, high-intelligence trading agent for Polymarket that leverages **Gemini 1.5 Flash** for strategic reasoning and the **Polymarket CLOB API** for execution. Built with a "no-bloat" philosophy, this agent provides "Straight Reasoning" logs for every trade, giving you full visibility into its decision-making process.

![Architecture Overview](https://img.shields.io/badge/Architecture-Vite_5_%2B_React_%2B_TS-646CFF?style=for-the-badge&logo=vite)
![AI-Powered](https://img.shields.io/badge/Brain-Gemini_1.5_Flash-4285F4?style=for-the-badge&logo=google-gemini)
![On-Chain](https://img.shields.io/badge/Exchange-Polymarket_CLOB-8247E5?style=for-the-badge&logo=polygon)

---

## ✨ Features

### 🧠 **Straight Reasoning Engine**
The agent thinking is transparent. For every market analysis, you'll see a multi-step rationale in the **Brain Feed** terminal, including:
- **Decision Logic**: Why it chose BUY, SELL, or HOLD.
- **Confidence Scoring**: 1-100% conviction level.
- **Sentiment Analysis**: Evaluation of current market sentiment vs. prices.

### 🎛️ **Dynamic Tuning Interface**
Fine-tune the agent's behavior in real-time without restarting:
- **Aggressiveness Slider**: Controls trade sizes and confidence thresholds.
- **Risk Tolerance**: Set to Low, Medium, or High to filter market opportunities.
- **Scan Interval**: Adjust how often the agent re-evaluates the market.

### 🚨 **Emergency Overrides**
- **Global Panic Button**: Instantly stops the agent and cancels all pending orders on the CLOB.
- **Demo Mode**: Test strategies safely on a "Dry Run" mode where trades are logged but not executed on-chain.

### 🛡️ **Security First**
- **In-Memory Credentials**: API Keys and Private Keys are stored only in your browser's session memory.
- **No Persistence**: Nothing sensitive is ever written to disk or `.env` files.

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js**: v18.14+ (v20+ recommended)
- **API Keys**:
  - Google Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))
  - Polygon Private Key (Burner wallet recommended)

### **Installation**
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ajokhai/polymarket-bot.git
   cd polymarket-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Launch the Dashboard**:
   ```bash
   npm run dev
   ```

4. **Onboarding**: Open the URL (default `http://localhost:5173`) and follow the onboarding wizard to input your keys.

---

## 📂 Project Structure

- `src/services/ai`: Gemini reasoning engine and prompt templates.
- `src/services/polymarket`: Gamma API (Discovery) and CLOB (Execution) clients.
- `src/components`: Premium UI components (Onboarding, Dashboard, Brain Feed).
- `src/utils`: EIP-712 signing and crypto utilities.

---

## ⚠️ Disclaimer

Prediction markets involve significant risk. This agent is a tool for professional research and automated execution; it is not financial advice. **Always start with a burner wallet and use Small trade sizes in Demo Mode before going live.**

---

## ⚖️ License

MIT License - see [LICENSE](LICENSE) for details.
