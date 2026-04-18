import React, { useMemo, useState } from 'react';
import { Transaction } from '../../services/polymarket/portfolio';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onClear: () => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

const STATUS_COLORS: Record<Transaction['status'], string> = {
  demo: 'rgba(255,255,255,0.3)',
  pending: 'var(--warning-color)',
  filled: 'var(--success-color)',
  failed: 'var(--panic-color)',
};

const ACTION_COLORS: Record<string, string> = {
  BUY: 'var(--success-color)',
  SELL: 'var(--panic-color)',
  HOLD: 'var(--text-muted)',
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onClear, onSelectTransaction }) => {
  const [collapsed, setCollapsed] = useState(false);

  const { totalCost, totalEV } = useMemo(() => {
    const active = transactions.filter(t => t.status === 'filled' || t.status === 'demo');
    return {
      totalCost: active.reduce((s, t) => s + t.cost, 0),
      totalEV:   active.reduce((s, t) => s + (t.ev ?? 0), 0),
    };
  }, [transactions]);

  return (
    <div className="glass" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : '1rem' }}>
        <h3 style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setCollapsed(c => !c)}>
          Transactions {transactions.length > 0 && `(${transactions.length})`}
          <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', opacity: 0.4 }}>{collapsed ? '▼' : '▲'}</span>
        </h3>
        {!collapsed && transactions.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Spent <strong style={{ color: 'var(--text)' }}>${totalCost.toFixed(2)}</strong>
              &ensp;·&ensp;Total EV <strong style={{ color: totalEV >= 0 ? 'var(--green)' : 'var(--red)' }}>{totalEV >= 0 ? '+' : ''}${totalEV.toFixed(2)}</strong>
            </span>
            <button onClick={onClear} style={{
              background: 'none', border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.2rem 0.5rem',
            }}>Clear</button>
          </div>
        )}
      </div>

      {!collapsed && (
        transactions.length === 0
          ? <p style={{ opacity: 0.4, fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>No transactions yet.</p>
          : (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[
                      { label: 'Time', tooltip: 'When the AI executed the trade' },
                      { label: 'Market', tooltip: 'The prediction market being analyzed' },
                      { label: 'Payout', tooltip: 'When this market officially resolves and pays out winners' },
                      { label: 'Side', tooltip: 'BUY or SELL action' },
                      { label: 'Exp. Return', tooltip: 'Expected Profit: How much we stand to make if the prediction is correct' },
                      { label: 'Max Loss', tooltip: 'Cost: How much we spent and stand to lose if the prediction is incorrect' },
                      { label: 'EV', tooltip: 'Expected Value: The mathematical viability of the trade factoring in the AI confidence vs market price' },
                      { label: 'Status', tooltip: 'The state of the transaction on the network' }
                    ].map((col, i) => (
                      <th key={col.label} data-tooltip={col.tooltip} style={{
                        padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.62rem',
                        letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
                        textAlign: i <= 1 ? 'left' : 'right', cursor: 'help'
                      }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const evPositive = tx.ev >= 0;
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => onSelectTransaction?.(tx)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: onSelectTransaction ? 'pointer' : 'default',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => { if(onSelectTransaction) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.68rem' }}>{tx.timestamp}</td>
                        <td style={{ padding: '0.35rem 0.5rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.market}>{tx.market}</td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
                          {tx.endDate ? new Date(tx.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: ACTION_COLORS[tx.action], fontWeight: 700 }}>{tx.action}</td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--green)', fontFamily: 'monospace' }}>
                          +${(tx.expectedProfit ?? 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--red)', fontFamily: 'monospace' }}>
                          -${(tx.maxLoss ?? 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: evPositive ? 'var(--green)' : 'var(--red)' }}>
                          {evPositive ? '+' : ''}${(tx.ev ?? 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                          <span style={{ color: STATUS_COLORS[tx.status], fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
};
