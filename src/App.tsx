import { useState, useEffect, useRef, useCallback } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { TuningPanel, TuningParams } from './components/dashboard/TuningPanel';
import { BrainFeed, LogEntry } from './components/dashboard/BrainFeed';
import { MarketCard } from './components/dashboard/MarketCard';
import { BalanceWidget } from './components/dashboard/BalanceWidget';
import { TransactionHistory } from './components/dashboard/TransactionHistory';
import { fetchMarkets, Market } from './services/polymarket/gamma';
import { analyzeMarket } from './services/ai/reasoning';
import { getClobClient, cancelAllOrders } from './services/polymarket/clob';
import { fetchUSDCBalance, getWalletAddress, loadTransactions, saveTransaction, clearTransactions, calcTradeExpectancy, Transaction } from './services/polymarket/portfolio';
import { Side, OrderType } from '@polymarket/clob-client';
import type { TickSize } from '@polymarket/clob-client';
import pkg from '../package.json';

const CREDS_KEY = 'pm_agent_creds';
const DEMO_STARTING_BALANCE = 1000;

interface Credentials {
  geminiKey: string;
  privateKey: string;
  claudeKey?: string;
  xaiKey?: string;
  openAiKey?: string;
  openRouterKey?: string;
}

const loadSavedCreds = (): Credentials | null => {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

function App() {
  const [creds, setCreds] = useState<Credentials | null>(loadSavedCreds);
  const [tuning, setTuning] = useState<TuningParams>({
    aggressiveness: 5,
    riskTolerance: 'medium',
    interval: 30,
    autoRotate: true,
    maxBudget: 0,
    model: 'gemini-3.1-pro-preview',
    directive: '',
  });
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [marketIndex, setMarketIndex] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [isLive, setIsLive] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [demoBalance, setDemoBalance] = useState(DEMO_STARTING_BALANCE);
  const startingBalanceRef = useRef(0);
  const demoStartingBalanceRef = useRef(DEMO_STARTING_BALANCE);

  const walletAddress = creds ? getWalletAddress(creds.privateKey) : '';
  const displayBalance = isDemo ? demoBalance : balance;
  const startingBalance = isDemo ? demoStartingBalanceRef.current : startingBalanceRef.current;

  const [marketTab, setMarketTab] = useState<'active' | 'traded'>('active');

  const tradedMarketTitles = new Set(transactions.filter(t => t.action !== 'HOLD').map(t => t.market));
  const activeMarkets = markets.filter(m => !tradedMarketTitles.has(m.question));
  const tradedMarkets = markets.filter(m => tradedMarketTitles.has(m.question));

  const displayMarkets = marketTab === 'active' ? activeMarkets : tradedMarkets;

  const liveRef = useRef({ creds, tuning, isDemo, activeMarkets, marketIndex, selectedMarket, balance, demoBalance, transactions });
  useEffect(() => {
    liveRef.current = { creds, tuning, isDemo, activeMarkets, marketIndex, selectedMarket, balance, demoBalance, transactions };
  });

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-200), { timestamp: new Date().toLocaleTimeString(), type, message }]);
  }, []);

  const recordTx = useCallback((tx: Transaction) => {
    setTransactions(prev => saveTransaction(tx, prev));
  }, []);

  const handleClearTx = useCallback(() => {
    clearTransactions();
    setTransactions([]);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!creds || isDemo) return;
    const bal = await fetchUSDCBalance(creds.privateKey);
    setBalance(bal);
    if (startingBalanceRef.current === 0) startingBalanceRef.current = bal;
  }, [creds, isDemo]);

  useEffect(() => {
    if (!creds || isDemo) return;
    refreshBalance();
    const t = setInterval(refreshBalance, 60_000);
    return () => clearInterval(t);
  }, [creds, isDemo, refreshBalance]);

  // Fetch once on mount, then poll only while agent is live
  useEffect(() => {
    const loadMarkets = async () => {
      setIsLoading(true);
      try {
        const data = await fetchMarkets({ active: true, limit: 50 });
        const sorted = [...data].sort((a, b) => b.volume - a.volume);
        setMarkets(sorted);
        if (!selectedMarket || !sorted.find(m => m.id === selectedMarket.id)) {
          setSelectedMarket(sorted[0] ?? null);
        }
      } catch (err) {
        console.error('Market load failed', err);
      } finally {
        setIsLoading(false);
      }
    };
  const fetchMarketsManual = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarkets({ active: true, limit: 50 });
      const sorted = [...data].sort((a, b) => b.volume - a.volume);
      setMarkets(sorted);
      addLog('info', 'Markets manually refreshed.');
    } catch (err) {
      console.error('Market load failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchMarketsManual();
    if (!isLive) return;
    const t = setInterval(fetchMarketsManual, 60_000);
    return () => clearInterval(t);
  }, [isLive, fetchMarketsManual]);

  const handleCredsComplete = (data: Credentials) => {
    localStorage.setItem(CREDS_KEY, JSON.stringify(data));
    setCreds(data);
  };

  const handleSetDemoBalance = useCallback((amount: number) => {
    demoStartingBalanceRef.current = amount;
    setDemoBalance(amount);
    addLog('info', `Demo balance reset to $${amount.toFixed(2)}.`);
  }, [addLog]);

  const handleResetExperiment = useCallback(() => {
    setIsLive(false);
    setDemoBalance(demoStartingBalanceRef.current);
    clearTransactions();
    setTransactions([]);
    setLogs([]);
    setMarketIndex(0);
    addLog('info', `Experiment reset. Balance restored to $${demoStartingBalanceRef.current.toFixed(2)}.`);
  }, [addLog]);

  // ─── Main Autonomous Decision Loop ──────────────────────────────────────────
  useEffect(() => {
    if (!isLive || !creds) return;

    const runTurn = async () => {
      const { creds: c, tuning: t, isDemo: demo, activeMarkets: mList, marketIndex: mIdx, balance: bal, demoBalance: demoBal, transactions: txList } = liveRef.current;
      if (!c || mList.length === 0) return;

      // Enforce cumulative budget cap — stop the agent when total spend hits maxBudget
      if (t.maxBudget > 0) {
        const totalSpent = txList
          .filter(tx => tx.status === 'demo' || tx.status === 'filled')
          .reduce((sum, tx) => sum + tx.cost, 0);
        if (totalSpent >= t.maxBudget) {
          addLog('info', `Budget limit of $${t.maxBudget.toFixed(2)} reached (spent $${totalSpent.toFixed(2)}). Stopping agent.`);
          setIsLive(false);
          return;
        }
      }

      const market = t.autoRotate ? mList[mIdx % mList.length] : liveRef.current.selectedMarket;
      if (!market) return;

      const label = t.autoRotate ? `[${(mIdx % mList.length) + 1}/${mList.length}]` : '[manual]';
      addLog('info', `${label} Analyzing: "${market.question}"`);

      const activeBal = demo ? demoBal : bal;
      const totalSpentSoFar = t.maxBudget > 0
        ? txList.filter(tx => tx.status === 'demo' || tx.status === 'filled').reduce((s, tx) => s + tx.cost, 0)
        : 0;
      const remainingBudget = t.maxBudget > 0 ? t.maxBudget - totalSpentSoFar : activeBal;
      const effectiveBudget = Math.min(remainingBudget, activeBal);

      const result = await analyzeMarket(c.geminiKey, {
        marketTitle: market.question,
        marketDescription: market.description,
        currentPrices: market.outcomePrices,
        outcomes: market.outcomes,
        aggressiveness: t.aggressiveness,
        riskTolerance: t.riskTolerance,
        directive: t.directive,
        model: t.model,
        claudeKey: c.claudeKey,
        xaiKey: c.xaiKey,
        openAiKey: c.openAiKey,
        openRouterKey: c.openRouterKey,
      });

      addLog('brain', `[${result.decision}] ${result.rationale} (${result.confidence}% confidence)`);

      if (result.decision === 'HOLD') {
        addLog('info', 'HOLD — no edge found, moving on.');
        if (t.autoRotate) setMarketIndex(prev => prev + 1);
        return;
      }

      const outcomeIndex = result.decision === 'BUY' ? 0 : 1;
      const price = result.limit_price ?? parseFloat(market.outcomePrices[outcomeIndex] ?? '0.5');
      const tradeSize = Math.max(1, Math.min(effectiveBudget * result.size_factor, effectiveBudget * 0.1));
      const tradeCost = tradeSize * price;
      const expectancy = calcTradeExpectancy(result.decision, price, tradeSize, result.confidence);

      const baseTx = {
        market: market.question, action: result.decision,
        outcome: market.outcomes[outcomeIndex] ?? result.decision,
        price, size: tradeSize, cost: tradeCost,
        confidence: result.confidence,
        ...expectancy,
      };

      if (demo) {
        setDemoBalance(prev => Math.max(0, prev - tradeCost));
        addLog('trade', `[DEMO] ${result.decision} ${market.outcomes[outcomeIndex]} @ ${(price * 100).toFixed(1)}¢ · +$${expectancy.expectedProfit.toFixed(2)} / -$${expectancy.maxLoss.toFixed(2)} · EV ${expectancy.ev >= 0 ? '+' : ''}$${expectancy.ev.toFixed(2)}`);
        recordTx({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), ...baseTx, status: 'demo' });
      } else {
        if (effectiveBudget < tradeCost) {
          addLog('error', `Insufficient budget: need $${tradeCost.toFixed(2)}, have $${effectiveBudget.toFixed(2)}.`);
          if (t.autoRotate) setMarketIndex(prev => prev + 1);
          return;
        }
        addLog('trade', `[LIVE] ${result.decision} ${market.outcomes[outcomeIndex]} · EV ${expectancy.ev >= 0 ? '+' : ''}$${expectancy.ev.toFixed(2)}`);
        const txId = crypto.randomUUID();
        try {
          const client = await getClobClient({ privateKey: c.privateKey, isDemo: demo });
          if (!client) throw new Error('CLOB client init failed');
          const tickSize = String(market.orderPriceMinTickSize || 0.01) as TickSize;
          const signedOrder = await client.createOrder({
            tokenID: market.clobTokenIds[outcomeIndex],
            price, side: result.decision === 'BUY' ? Side.BUY : Side.SELL, size: tradeSize,
          }, tickSize);
          const resp = await client.postOrder(signedOrder, OrderType.GTC);
          const orderId = (resp as any)?.orderID ?? (resp as any)?.id ?? '';
          setBalance(prev => Math.max(0, prev - tradeCost));
          addLog('trade', `✓ Order placed${orderId ? ` (${orderId.slice(0, 10)}...)` : ''} — gasless via relayer`);
          recordTx({ id: txId, timestamp: new Date().toLocaleTimeString(), ...baseTx, status: 'filled', orderId });
          refreshBalance();
        } catch (err: any) {
          addLog('error', `Trade failed: ${err.message}`);
          recordTx({ id: txId, timestamp: new Date().toLocaleTimeString(), ...baseTx, status: 'failed', error: err.message });
        }
      }

      if (t.autoRotate) setMarketIndex(prev => prev + 1);
    };

    runTurn();
    const t = setInterval(runTurn, tuning.interval * 1000);
    return () => clearInterval(t);
  }, [isLive, creds, tuning.interval, addLog, recordTx, refreshBalance]);
  // ────────────────────────────────────────────────────────────────────────────

  if (!creds) return <OnboardingWizard onComplete={handleCredsComplete} />;

  return (
    <div className="app-container fade-in">
      <header className="app-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <h1>Polymarket Agent</h1>
            <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 600, letterSpacing: '0.05em' }}>v{pkg.version}</span>
          </div>
          <div className="status-row">
            <span className={`status-dot ${isLive ? 'status-dot--live' : ''}`} />
            <span className="status-text">
              {isLive ? 'RUNNING' : 'IDLE'} · {isDemo ? 'DEMO' : 'LIVE'} · {tuning.autoRotate ? 'AUTO-SCAN' : 'MANUAL'}
            </span>
            <button className="link-btn" onClick={() => {
              if (confirm('Clear saved credentials and return to setup?')) {
                localStorage.removeItem(CREDS_KEY);
                setIsLive(false);
                setCreds(null);
              }
            }}>reset keys</button>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`mode-btn ${!isDemo ? 'mode-btn--live' : ''}`}
            onClick={() => {
              if (!isDemo && isLive) { setIsLive(false); addLog('info', 'Agent stopped before switching to Demo.'); }
              const next = !isDemo;
              setIsDemo(next);
              if (!next) refreshBalance();
              addLog('info', `Switched to ${next ? 'DEMO' : 'LIVE'} mode.`);
            }}
          >
            {isDemo ? '🧪 Demo' : '🔴 Live'}
          </button>
          <button
            className={isLive ? 'btn-panic' : 'btn-primary'}
            onClick={() => {
              const starting = !isLive;
              if (starting && markets.length === 0) { addLog('error', 'Markets not loaded — wait a moment.'); return; }
              setIsLive(starting);
              addLog('info', starting
                ? `Agent started. ${tuning.autoRotate ? `Auto-scanning ${markets.length} markets.` : `Targeting: "${selectedMarket?.question}"`}`
                : 'Agent stopped.');
            }}
          >
            {isLive ? '⏹ Stop' : '▶ Start Agent'}
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <main>
          <div className="glass market-panel">
            <div className="panel-header" style={{ marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>Markets</h3>
                {tuning.autoRotate && isLive && (
                  <span className="scanning-badge">
                    SCANNING #{(marketIndex % Math.max(activeMarkets.length, 1)) + 1}
                  </span>
                )}
                {isLoading && <span className="loading-text" style={{ marginLeft: '0.5rem' }}>Refreshing…</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-btn" onClick={() => {
                  setTuning(prev => ({ ...prev, autoRotate: false }));
                  setMarketIndex(prev => Math.max(0, prev - 1));
                  setSelectedMarket(displayMarkets[Math.max(0, marketIndex - 1)] ?? null);
                }} title="Previous Market">{'<'}</button>
                <button className="icon-btn" onClick={() => {
                  setTuning(prev => ({ ...prev, autoRotate: false }));
                  setMarketIndex(prev => prev + 1);
                  setSelectedMarket(displayMarkets[(marketIndex + 1) % displayMarkets.length] ?? null);
                }} title="Next Market">{'>'}</button>
                <button className="icon-btn" onClick={fetchMarketsManual} title="Refresh Markets">↻ Refresh</button>
              </div>
            </div>

            <div className="tabs-container">
              <div className={`tab ${marketTab === 'active' ? 'active' : ''}`} onClick={() => setMarketTab('active')}>
                Active Queue ({activeMarkets.length})
              </div>
              <div className={`tab ${marketTab === 'traded' ? 'active' : ''}`} onClick={() => setMarketTab('traded')}>
                Already Traded ({tradedMarkets.length})
              </div>
            </div>

            {displayMarkets.length === 0 && !isLoading
              ? <p className="empty-state">No markets found in this view.</p>
              : (
                <div className="markets-grid">
                  {displayMarkets.map((m, i) => (
                    <MarketCard
                      key={m.id} market={m}
                      isSelected={selectedMarket?.id === m.id}
                      isActive={marketTab === 'active' && tuning.autoRotate && isLive && (marketIndex % displayMarkets.length) === i}
                      onSelect={m => { setSelectedMarket(m); setMarketIndex(displayMarkets.indexOf(m)); }}
                    />
                  ))}
                </div>
              )}
          </div>
          <BrainFeed logs={logs} />
          <TransactionHistory transactions={transactions} onClear={handleClearTx} />
        </main>

        <aside>
          <BalanceWidget
            balance={displayBalance}
            startingBalance={startingBalance}
            isDemo={isDemo}
            walletAddress={walletAddress}
            isRefreshing={false}
            onRefresh={refreshBalance}
          />
          <TuningPanel
            params={tuning}
            onChange={setTuning}
            balance={displayBalance}
            isDemo={isDemo}
            onSetDemoBalance={handleSetDemoBalance}
          />
          <div className="glass emergency-panel">
            <h3>Emergency</h3>
            <button className="btn-panic btn-full" onClick={async () => {
              setIsLive(false);
              addLog('error', 'PANIC: stopping agent and canceling all orders…');
              if (creds) {
                try {
                  const client = await getClobClient({ privateKey: creds.privateKey, isDemo });
                  if (client) { await cancelAllOrders(client); addLog('info', 'All orders canceled.'); }
                } catch (err: any) { addLog('error', `Cancel failed: ${err.message}`); }
              }
            }}>⛔ Stop & Cancel All</button>
            <button className="btn-panic btn-full btn-muted" onClick={() =>
              addLog('error', 'Position liquidation requires the Data API — coming soon.')
            }>🚨 Exit All Positions</button>
            {isDemo && (
              <button
                onClick={handleResetExperiment}
                style={{
                  width: '100%', marginTop: '0.5rem',
                  background: 'rgba(246,173,85,0.1)',
                  color: 'var(--yellow)',
                  border: '1px solid rgba(246,173,85,0.2)',
                }}
              >↺ Reset Experiment</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
