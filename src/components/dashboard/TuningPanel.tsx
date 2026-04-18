import React, { useState } from 'react';

export interface TuningParams {
  aggressiveness: number;
  riskTolerance: 'low' | 'medium' | 'high';
  interval: number;
  autoRotate: boolean;
  maxBudget: number;
  model: string;
  directive: string;
}

export const AI_MODELS = [
  {
    group: 'Gemini 3.x (Google)',
    models: [
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro — Smartest, deep reasoning' },
      { id: 'gemini-3-deep-think-preview', label: 'Gemini 3 Deep Think — Maximum logic' },
      { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite — Fast & cheap' },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash — Balanced' }
    ]
  },
  {
    group: 'Claude 3.5 (Anthropic)',
    models: [
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet — Elite coding/logic' },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku — Fast & capable' }
    ]
  },
  {
    group: 'Grok (xAI)',
    models: [
      { id: 'grok-2-1212', label: 'Grok 2 — Unfiltered logic' },
      { id: 'grok-2-mini', label: 'Grok 2 Mini — Fast' }
    ]
  },
  {
    group: 'OpenAI',
    models: [
      { id: 'o1-preview', label: 'o1 Preview — Deep reasoning' },
      { id: 'o3-mini', label: 'o3 Mini — Fast reasoning' },
      { id: 'gpt-4o', label: 'GPT-4o — Flagship' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini — Small' }
    ]
  },
  {
    group: 'OpenRouter / Others',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', label: 'OR: Claude 3.5 Sonnet' },
      { id: 'google/gemini-3-pro', label: 'OR: Gemini 3 Pro' },
      { id: 'openai/o1-pro', label: 'OR: o1 Pro' }
    ]
  }
];

interface TuningPanelProps {
  params: TuningParams;
  onChange: (params: TuningParams) => void;
  balance: number;
  isDemo: boolean;
  onSetDemoBalance: (amount: number) => void;
}

const Toggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <div onClick={onToggle} style={{
    width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0,
    background: value ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
    position: 'relative', transition: 'background 0.2s',
  }}>
    <div style={{
      position: 'absolute', top: '3px', width: '18px', height: '18px',
      borderRadius: '50%', background: 'white', transition: 'left 0.2s',
      left: value ? '23px' : '3px',
    }} />
  </div>
);

const ConfirmedInput: React.FC<{
  label: string;
  initialValue: number | string;
  placeholder?: string;
  hint?: string;
  onConfirm: (value: number) => void;
  min?: number;
  step?: number;
}> = ({ label, initialValue, placeholder, hint, onConfirm, min = 0, step = 10 }) => {
  const [draft, setDraft] = useState(String(initialValue || ''));
  const [confirmed, setConfirmed] = useState(initialValue !== 0 ? Number(initialValue) : null as number | null);
  const dirty = draft !== String(confirmed ?? '');

  const apply = () => {
    const v = parseFloat(draft);
    if (!isNaN(v) && v >= min) {
      setConfirmed(v);
      onConfirm(v);
    }
  };

  return (
    <div className="tuning-row">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          type="number" min={min} step={step}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          style={{ marginBottom: 0, flex: 1 }}
        />
        <button
          onClick={apply}
          disabled={!dirty || draft === ''}
          style={{
            padding: '0.4rem 0.7rem', fontSize: '0.72rem', fontWeight: 700,
            background: dirty && draft !== '' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
            color: dirty && draft !== '' ? '#05080f' : 'var(--text-muted)',
            border: '1px solid ' + (dirty && draft !== '' ? 'var(--accent)' : 'var(--border)'),
            borderRadius: 'var(--radius-sm)', cursor: dirty && draft !== '' ? 'pointer' : 'default',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >Set</button>
      </div>
      {confirmed !== null && confirmed > 0 && (
        <p className="hint">Active: ${confirmed.toFixed(2)} USDC</p>
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
};

const formatInterval = (s: number) =>
  s < 60 ? `${s}s` : s < 3600 ? `${(s / 60).toFixed(0)}m` : `${(s / 3600).toFixed(1)}h`;

const IntervalInput: React.FC<{ params: TuningParams, onChange: (p: TuningParams) => void }> = ({ params, onChange }) => {
  const [draft, setDraft] = useState(String(params.interval));
  const dirty = draft !== String(params.interval);

  const apply = () => {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v >= 3) {
      onChange({ ...params, interval: v });
    }
  };

  return (
    <div className="tuning-row">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
        <label style={{ marginBottom: 0 }}>Scan Interval: {formatInterval(params.interval)}</label>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <input
          type="number" min="3" max="86400" value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          style={{ marginBottom: 0, flex: 1, padding: '0.4rem 0.75rem' }}
        />
        <button
          onClick={apply}
          disabled={!dirty || draft === ''}
          style={{
            padding: '0.4rem 0.7rem', fontSize: '0.72rem', fontWeight: 700,
            background: dirty && draft !== '' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
            color: dirty && draft !== '' ? '#05080f' : 'var(--text-muted)',
            border: '1px solid ' + (dirty && draft !== '' ? 'var(--accent)' : 'var(--border)'),
            borderRadius: 'var(--radius-sm)', cursor: dirty && draft !== '' ? 'pointer' : 'default',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >Set Interval</button>
      </div>
      <input type="range" min="3" max="3600" step="1" value={Math.min(parseInt(draft) || 3, 3600)}
        onChange={e => {
          setDraft(e.target.value);
        }} />
      <p className="hint">3s–3600s via slider; click "Set Interval" to apply.</p>
    </div>
  );
};

export const TuningPanel: React.FC<TuningPanelProps> = ({ params, onChange, balance, isDemo, onSetDemoBalance }) => {
  const effectiveBudget = params.maxBudget === 0 ? balance : Math.min(params.maxBudget, balance);

  return (
    <div className="glass">
      <h3>Tuning</h3>

      <div className="tuning-row">
        <label>Agent Directive</label>
        <textarea
          value={params.directive}
          onChange={e => onChange({ ...params, directive: e.target.value })}
          placeholder="e.g. Focus on political markets. Only trade when confidence > 75%."
          rows={3}
          style={{
            width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
            fontFamily: 'inherit', fontSize: '0.82rem', resize: 'vertical',
            outline: 'none', lineHeight: 1.5, marginBottom: 0,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      <div className="tuning-row">
        <label>Aggressiveness: {params.aggressiveness}</label>
        <input type="range" min="1" max="10" value={params.aggressiveness}
          onChange={e => onChange({ ...params, aggressiveness: parseInt(e.target.value) })} />
        <p className="hint">Higher = larger sizes & lower confidence threshold.</p>
      </div>

      <div className="tuning-row">
        <label>Risk Tolerance</label>
        <select value={params.riskTolerance}
          onChange={e => onChange({ ...params, riskTolerance: e.target.value as TuningParams['riskTolerance'] })}>
          <option value="low">Low — Safe only</option>
          <option value="medium">Medium — Balanced</option>
          <option value="high">High — Maximum opportunity</option>
        </select>
      </div>

      <IntervalInput params={params} onChange={onChange} />

      <div className="tuning-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <label style={{ marginBottom: 0 }}>Auto-Rotate Markets</label>
          <p className="hint" style={{ marginTop: '0.2rem' }}>Cycle all active markets each turn.</p>
        </div>
        <Toggle value={params.autoRotate} onToggle={() => onChange({ ...params, autoRotate: !params.autoRotate })} />
      </div>

      <div className="tuning-row">
        <label>AI Model</label>
        <select value={params.model} onChange={e => onChange({ ...params, model: e.target.value })}>
          {AI_MODELS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="hint">Make sure you have added the required API keys in setup for non-Gemini models.</p>
      </div>

      <ConfirmedInput
        label="Max Trade Budget (USDC)"
        initialValue={params.maxBudget}
        placeholder="0 = unlimited"
        hint={params.maxBudget > 0 && balance > 0 ? `Agent has $${effectiveBudget.toFixed(2)} available; stops when spent.` : undefined}
        onConfirm={v => onChange({ ...params, maxBudget: v })}
        min={0}
        step={10}
      />

      {isDemo && (
        <ConfirmedInput
          label="Demo Starting Balance (USDC)"
          initialValue={1000}
          placeholder="e.g. 1000"
          hint="Resets demo balance to this amount."
          onConfirm={onSetDemoBalance}
          min={1}
          step={100}
        />
      )}
    </div>
  );
};
