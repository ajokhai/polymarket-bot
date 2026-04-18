import { ethers } from 'ethers';

// USDC.e (bridged USDC) on Polygon PoS — the token Polymarket settles in
const POLYGON_RPC = 'https://polygon-rpc.com';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];
const TX_KEY = 'pm_tx_history';

// Singleton — creating a new provider every 60s leaks connections
const _provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);

export interface Transaction {
  id: string;
  timestamp: string;
  market: string;
  endDate?: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  outcome: string;
  price: number;
  size: number;
  cost: number;
  expectedProfit: number;
  maxLoss: number;
  ev: number;
  confidence: number;
  status: 'demo' | 'pending' | 'filled' | 'failed';
  orderId?: string;
  error?: string;
}

export const calcTradeExpectancy = (
  action: 'BUY' | 'SELL',
  price: number,
  size: number,
  confidencePct: number,
): { expectedProfit: number; maxLoss: number; ev: number } => {
  // BUY: pay `price` per share, win `1−price` if correct, lose `price` if wrong
  // SELL: receive `price` per share, win `price` if correct, lose `1−price` if wrong
  const expectedProfit = action === 'BUY' ? size * (1 - price) : size * price;
  const maxLoss        = action === 'BUY' ? size * price       : size * (1 - price);
  const c = confidencePct / 100;
  const ev = c * expectedProfit - (1 - c) * maxLoss;
  return { expectedProfit, maxLoss, ev };
};

export const getWalletAddress = (privateKey: string): string => {
  try { return new ethers.Wallet(privateKey).address; } catch { return ''; }
};

export const fetchUSDCBalance = async (privateKey: string): Promise<number> => {
  try {
    const address = getWalletAddress(privateKey);
    if (!address) return 0;
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, _provider);
    const [raw, decimals]: [ethers.BigNumber, number] = await Promise.all([
      usdc.balanceOf(address),
      usdc.decimals(),
    ]);
    return parseFloat(ethers.utils.formatUnits(raw, decimals));
  } catch {
    return 0;
  }
};

export const loadTransactions = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(TX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveTransaction = (tx: Transaction, current: Transaction[]): Transaction[] => {
  const updated = [tx, ...current].slice(0, 500);
  localStorage.setItem(TX_KEY, JSON.stringify(updated));
  return updated;
};

export const clearTransactions = (): void => localStorage.removeItem(TX_KEY);
