/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

// External
import React, {useEffect, useMemo, useRef, useState} from 'react';

// Ours
import {useAi} from 'src/script/ai';
import {OllamaClient} from 'src/script/ai/ollama/OllamaClient';
import type {OllamaModelInfo} from 'src/script/ai/ollama/OllamaTypes';
import {useAiSettingsDraftStore} from 'src/script/ai/stores/useAiSettingsDraftStore';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/OllamaConnectionSection');

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'pass' | 'fail';
type ConnectionStatus = 'unknown' | 'connected' | 'error' | 'testing';

interface TestStep {
  label: string;
  status: StepStatus;
  detail?: string;
  elapsedMs?: number;
}

interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
}

// ─── CSS keyframe injection ───────────────────────────────────────────────────

let pulseCssInjected = false;

const injectPulseCSS = () => {
  if (pulseCssInjected || typeof document === 'undefined') return;
  pulseCssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ollama-dot-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.35; transform: scale(0.8); }
    }
    .ollama-pulse { animation: ollama-dot-pulse 1.4s ease-in-out infinite; }
    @keyframes ollama-step-in {
      from { opacity: 0; transform: translateX(-4px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .ollama-step-in { animation: ollama-step-in 0.18s ease-out forwards; }
  `;
  document.head.appendChild(style);
};

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

const ServerIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{flexShrink: 0}}>
    <rect x="0.75" y="1.75" width="13.5" height="3.75" rx="1.25" stroke="currentColor" strokeWidth="1.3" />
    <rect x="0.75" y="8.5"  width="13.5" height="3.75" rx="1.25" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="11.75" cy="3.625" r="0.85" fill="currentColor" />
    <circle cx="11.75" cy="10.375" r="0.85" fill="currentColor" />
    <line x1="2.75" y1="3.625" x2="9.25" y2="3.625" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
    <line x1="2.75" y1="10.375" x2="9.25" y2="10.375" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
  </svg>
);

const ChevronDownIcon = ({open}: {open: boolean}) => (
  <svg
    width="11" height="11" viewBox="0 0 11 11" fill="none"
    style={{transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0}}
  >
    <path d="M1.5 3.5L5.5 7.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Wire dark-theme palette (used throughout) ────────────────────────────────
// --gray-95: #26272c  (app background)
// --gray-100: #17181a (darker surfaces)
// --gray-90: #34373d  (borders)
// --gray-80: #54585f  (darker secondary text)
// --gray-70: #676b71  (secondary / muted labels)
// --gray-60: #9fa1a7  (secondary text)
// --gray-40: #dce0e3  (labels, lighter text)

// ─── Card-level styles ────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border:       '1px solid #34373d',
  borderRadius: '10px',
  overflow:     'visible',
  background:   '#26272c',
  boxShadow:    '0 2px 12px rgba(0,0,0,0.3)',
  marginBottom: '32px',
  position:     'relative',
};

const cardHeaderStyle: React.CSSProperties = {
  background:    '#1f2023',
  borderBottom:  '1px solid #34373d',
  borderRadius:  '10px 10px 0 0',
  padding:       '13px 20px',
  display:       'flex',
  alignItems:    'center',
  justifyContent:'space-between',
};

const headerLeftStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '9px',
  color:      '#9fa1a7',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize:      '0.8rem',
  fontWeight:    700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color:         '#dce0e3',
};

const cardBodyStyle: React.CSSProperties = {
  padding:       '18px 20px 20px',
  display:       'flex',
  flexDirection: 'column' as const,
  gap:           '13px',
  borderRadius:  '0 0 10px 10px',
};

// ─── Sub-card styles ──────────────────────────────────────────────────────────

const subCardStyle: React.CSSProperties = {
  background:   '#17181a',
  border:       '1px solid #34373d',
  borderRadius: '8px',
  padding:      '13px 15px',
};

const subCardLabelStyle: React.CSSProperties = {
  display:       'flex',
  alignItems:    'center',
  gap:           '8px',
  fontSize:      '0.63rem',
  fontWeight:    700,
  letterSpacing: '0.13em',
  textTransform: 'uppercase' as const,
  color:         '#676b71',
  marginBottom:  '10px',
};

const labelLineStyle: React.CSSProperties = {
  flex:       1,
  height:     '1px',
  background: 'linear-gradient(to right, #34373d, transparent)',
};

// ─── Input + button styles ────────────────────────────────────────────────────

const urlInputStyle: React.CSSProperties = {
  flex:        1,
  padding:     '7px 10px',
  background:  '#000',
  border:      '1px solid #34373d',
  borderRadius:'5px',
  color:       '#fff',
  fontSize:    '0.82rem',
  fontFamily:  "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  boxSizing:   'border-box' as const,
  outline:     'none',
};

const modelInputStyle: React.CSSProperties = {
  ...urlInputStyle,
  width: '100%',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding:       '7px 18px',
  background:    '#3b82f6',
  color:         '#fff',
  border:        '1px solid #3b82f6',
  borderRadius:  '6px',
  cursor:        'pointer',
  fontWeight:    600,
  fontSize:      '0.8rem',
  letterSpacing: '0.02em',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding:      '7px 18px',
  background:   '#26272c',
  color:        '#9fa1a7',
  border:       '1px solid #34373d',
  borderRadius: '6px',
  cursor:       'pointer',
  fontSize:     '0.8rem',
};

const btnMiniStyle: React.CSSProperties = {
  padding:      '5px 11px',
  background:   '#26272c',
  color:        '#9fa1a7',
  border:       '1px solid #34373d',
  borderRadius: '5px',
  cursor:       'pointer',
  fontSize:     '0.71rem',
  whiteSpace:   'nowrap' as const,
  flexShrink:   0,
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ConnectionStatus, {bg: string; border: string; dot: string; text: string; label: string; pulse?: boolean}> = {
  unknown:   {bg: 'rgba(52,55,61,0.6)',        border: '#34373d',               dot: '#54585f', text: '#9fa1a7',  label: 'Not tested'},
  connected: {bg: 'rgba(34,197,94,0.07)',      border: 'rgba(74,222,128,0.22)', dot: '#4ade80', text: '#86efac',  label: 'Connected', pulse: true},
  error:     {bg: 'rgba(239,68,68,0.07)',      border: 'rgba(248,113,113,0.2)', dot: '#f87171', text: '#fca5a5',  label: 'Error'},
  testing:   {bg: 'rgba(59,130,246,0.08)',     border: 'rgba(96,165,250,0.25)', dot: '#60a5fa', text: '#93c5fd',  label: 'Testing…',  pulse: true},
};

const ConnectionStatusBadge = ({status}: {status: ConnectionStatus}) => {
  const c = STATUS_CFG[status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '4px 11px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '20px',
      fontSize: '0.71rem',
      color: c.text,
      userSelect: 'none',
    }}>
      <span
        className={c.pulse ? 'ollama-pulse' : ''}
        style={{
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: c.dot,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: `0 0 6px ${c.dot}60`,
        }}
      />
      {c.label}
    </div>
  );
};

// ─── URL breakdown grid ───────────────────────────────────────────────────────

const UrlBreakdown = ({parsed}: {parsed: ParsedUrl | null}) => {
  if (!parsed) return null;
  const cell = (label: string, value: string) => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
      <div style={{fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#54585f'}}>
        {label}
      </div>
      <div style={{fontSize: '0.75rem', fontFamily: "'JetBrains Mono', Consolas, monospace", color: '#9fa1a7'}}>
        {value}
      </div>
    </div>
  );
  return (
    <div style={{
      display: 'flex', gap: '0', marginTop: '9px',
      background: '#000',
      border: '1px solid #34373d',
      borderRadius: '5px',
      overflow: 'hidden',
    }}>
      {[
        {label: 'Protocol', value: parsed.protocol},
        {label: 'Host',     value: parsed.hostname},
        {label: 'Port',     value: parsed.port},
      ].map(({label, value}, i) => (
        <div key={label} style={{
          flex: i === 1 ? 2 : 1,
          padding: '7px 10px',
          borderRight: i < 2 ? '1px solid #34373d' : 'none',
        }}>
          {cell(label, value)}
        </div>
      ))}
    </div>
  );
};

// ─── Capability chips ─────────────────────────────────────────────────────────

const CapChip = ({color, label}: {color: string; label: string}) => (
  <span style={{
    display:     'inline-flex',
    alignItems:  'center',
    padding:     '2px 8px',
    borderRadius:'10px',
    fontSize:    '0.67rem',
    fontWeight:  600,
    background:  `${color}14`,
    border:      `1px solid ${color}38`,
    color:       color,
  }}>
    {label}
  </span>
);

const ModelCaps = ({model}: {model: OllamaModelInfo | undefined}) => {
  if (!model) return null;
  const chips: Array<{color: string; label: string}> = [];
  if (model.supportsTools === true)    chips.push({color: '#4ade80', label: '⚙ Tools'});
  if (model.supportsThinking === true) chips.push({color: '#a78bfa', label: '◉ Thinking'});
  if (model.parameterSize)             chips.push({color: '#60a5fa', label: model.parameterSize});
  if (model.quantization)              chips.push({color: '#9fa1a7', label: model.quantization});
  if (model.contextLength)             chips.push({color: '#fb923c', label: `${Math.round(model.contextLength / 1024)}K ctx`});
  if (chips.length === 0)              return null;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '9px'}}>
      {chips.map(c => <CapChip key={c.label} color={c.color} label={c.label} />)}
    </div>
  );
};

// ─── Model table dropdown ─────────────────────────────────────────────────────

const formatSize = (bytes: number): string => {
  if (!bytes) return '—';
  return `${(bytes / 1e9).toFixed(1)} GB`;
};

const formatCtx = (tokens: number | null): string => {
  if (tokens === null) return '—';
  return tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : String(tokens);
};

const boolIcon  = (v: boolean | null): string => (v === true ? '✓' : v === false ? '✗' : '?');
const boolColor = (v: boolean | null): string => (v === true ? '#4ade80' : v === false ? '#34373d' : '#34373d');

interface ModelTableDropdownProps {
  models: OllamaModelInfo[];
  selectedName: string;
  onSelect: (name: string) => void;
}

const ModelTableDropdown = ({models, selectedName, onSelect}: ModelTableDropdownProps) => {
  const [open, setOpen]     = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = models.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
    setFilter('');
  };

  const thBase: React.CSSProperties = {
    padding:         '5px 8px',
    textAlign:       'left',
    color:           '#676b71',
    fontWeight:      700,
    fontSize:        '0.62rem',
    textTransform:   'uppercase' as const,
    letterSpacing:   '0.1em',
    borderBottom:    '1px solid #34373d',
    position:        'sticky' as const,
    top:             0,
    backgroundColor: '#17181a',
    whiteSpace:      'nowrap' as const,
  };

  const tdBase: React.CSSProperties = {
    padding:    '5px 8px',
    color:      '#dce0e3',
    borderBottom:'1px solid #26272c',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div ref={wrapperRef} style={{position: 'relative'}}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px',
          background: '#000',
          border: `1px solid ${open ? '#9fa1a7' : '#34373d'}`,
          borderRadius: '5px',
          color: '#fff',
          fontSize: '0.82rem',
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
        onClick={() => setOpen(v => !v)}
        role="button"
        tabIndex={0}
      >
        <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {selectedName || <span style={{color: '#676b71'}}>Select a model…</span>}
        </span>
        <span style={{color: '#676b71', marginLeft: '8px'}}>
          <ChevronDownIcon open={open} />
        </span>
      </div>

      {open && (
        <div style={{
          position:      'absolute',
          top:           'calc(100% + 4px)',
          left:          0,
          zIndex:        100,
          backgroundColor: '#17181a',
          border:        '1px solid #34373d',
          borderRadius:  '8px',
          boxShadow:     '0 12px 32px rgba(0,0,0,0.6)',
          minWidth:      '680px',
          maxHeight:     '320px',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
        }}>
          <div style={{padding: '8px 8px 0'}}>
            <input
              autoFocus
              style={{
                width: '100%', padding: '6px 10px',
                background: '#000', border: '1px solid #34373d', borderRadius: '5px',
                color: '#fff', fontSize: '0.8rem',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                boxSizing: 'border-box', outline: 'none',
              }}
              placeholder="Filter models…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div style={{overflowY: 'auto', flex: 1, marginTop: '6px'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem'}}>
              <thead>
                <tr>
                  <th style={thBase}>Name</th>
                  <th style={{...thBase, textAlign: 'right'}}>Disk</th>
                  <th style={{...thBase, textAlign: 'right'}}>Params</th>
                  <th style={thBase}>Quant</th>
                  <th style={{...thBase, textAlign: 'right'}}>Ctx</th>
                  <th style={{...thBase, textAlign: 'center'}}>Tools</th>
                  <th style={{...thBase, textAlign: 'center'}}>Think</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isSel = m.name === selectedName;
                  return (
                    <tr
                      key={m.name}
                      style={{backgroundColor: isSel ? '#34373d' : 'transparent', cursor: 'pointer'}}
                      onClick={() => handleSelect(m.name)}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = '#26272c'; }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{...tdBase, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.name}</td>
                      <td style={{...tdBase, textAlign: 'right', color: '#9fa1a7'}}>{formatSize(m.sizeBytes)}</td>
                      <td style={{...tdBase, textAlign: 'right', color: '#9fa1a7'}}>{m.parameterSize || '—'}</td>
                      <td style={{...tdBase, color: '#9fa1a7'}}>{m.quantization || '—'}</td>
                      <td style={{...tdBase, textAlign: 'right', color: '#9fa1a7'}}>{formatCtx(m.contextLength)}</td>
                      <td style={{...tdBase, textAlign: 'center', color: boolColor(m.supportsTools), fontWeight: 700}}>{boolIcon(m.supportsTools)}</td>
                      <td style={{...tdBase, textAlign: 'center', color: boolColor(m.supportsThinking), fontWeight: 700}}>{boolIcon(m.supportsThinking)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{...tdBase, textAlign: 'center', color: '#54585f', padding: '14px'}}>
                      No models match
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Test results panel ───────────────────────────────────────────────────────

const STEP_CFG: Record<StepStatus, {icon: string; color: string; pulse?: boolean}> = {
  pending: {icon: '○', color: '#34373d'},
  running: {icon: '◌', color: '#60a5fa', pulse: true},
  pass:    {icon: '✓', color: '#4ade80'},
  fail:    {icon: '✗', color: '#f87171'},
};

const TestResultsPanel = ({steps}: {steps: TestStep[]}) => {
  const done      = steps.every(s => s.status === 'pass' || s.status === 'fail');
  const allPassed = done && steps.every(s => s.status === 'pass');
  const anyFailed = steps.some(s => s.status === 'fail');

  return (
    <div style={{
      background:   '#17181a',
      border:       `1px solid ${anyFailed ? '#4a2a2a' : '#34373d'}`,
      borderRadius: '8px',
      overflow:     'hidden',
    }}>
      <div style={{
        padding:      '7px 14px',
        background:   '#1f2023',
        borderBottom: `1px solid ${anyFailed ? '#4a2a2a' : '#34373d'}`,
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
      }}>
        <span style={{
          fontSize: '0.61rem', fontWeight: 700,
          letterSpacing: '0.13em', textTransform: 'uppercase',
          color: '#676b71',
        }}>
          Diagnostics
        </span>
        {done && (
          <span style={{
            marginLeft:   'auto',
            fontSize:     '0.63rem',
            fontWeight:   700,
            color:        allPassed ? '#4ade80' : '#f87171',
            background:   allPassed ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border:       `1px solid ${allPassed ? '#4ade8030' : '#f8717130'}`,
            borderRadius: '10px',
            padding:      '1px 9px',
          }}>
            {allPassed ? 'All checks passed' : 'Check failed'}
          </span>
        )}
      </div>

      <div style={{padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {steps.map((step, i) => {
          const sc = STEP_CFG[step.status];
          return (
            <div key={i} className="ollama-step-in" style={{display: 'flex', alignItems: 'flex-start', gap: '10px'}}>
              <span
                className={sc.pulse ? 'ollama-pulse' : ''}
                style={{
                  color: sc.color, fontWeight: 700, fontSize: '0.88rem',
                  width: '16px', textAlign: 'center', flexShrink: 0, lineHeight: '1.3',
                }}
              >
                {sc.icon}
              </span>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontSize: '0.77rem', color: '#dce0e3', lineHeight: '1.3'}}>{step.label}</div>
                {step.detail && (
                  <div style={{
                    fontSize: '0.7rem', color: '#9fa1a7', marginTop: '2px',
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    wordBreak: 'break-all',
                  }}>
                    {step.detail}
                    {step.elapsedMs !== undefined && (
                      <span style={{color: '#54585f', marginLeft: '6px'}}>({step.elapsedMs}ms)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

/** AI Preferences section for configuring the Ollama server URL and model name. */
export const OllamaConnectionSection = () => {
  const {aiSettings} = useAi();
  const {ollamaUrl, ollamaModel, knownModels, setField} = useAiSettingsDraftStore();

  const [testSteps,        setTestSteps]        = useState<TestStep[] | null>(null);
  const [isTesting,        setIsTesting]        = useState(false);
  const [isLoadingModels,  setIsLoadingModels]  = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');

  useEffect(() => { injectPulseCSS(); }, []);

  const parsedUrl = useMemo((): ParsedUrl | null => {
    try {
      const u = new URL(ollamaUrl);
      return {
        protocol: u.protocol.replace(':', ''),
        hostname: u.hostname,
        port:     u.port || (u.protocol === 'https:' ? '443' : '80'),
      };
    } catch {
      return null;
    }
  }, [ollamaUrl]);

  const selectedModelInfo = useMemo(
    () => knownModels.find(m => m.name === ollamaModel),
    [knownModels, ollamaModel],
  );

  const handleSave = async () => {
    try {
      await Promise.all([aiSettings.setOllamaUrl(ollamaUrl), aiSettings.setOllamaModel(ollamaModel)]);
    } catch (err) {
      log.error('Failed to save Ollama connection settings', err);
    }
  };

  const handleGetModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await new OllamaClient(ollamaUrl, ollamaModel).listModelsWithDetails();
      setField('knownModels', models);
      await aiSettings.setKnownModels(models);
    } catch (err) {
      log.error('Failed to fetch model list from Ollama', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setConnectionStatus('testing');

    const capturedModel = ollamaModel;
    const steps: TestStep[] = [
      {label: 'Checking Ollama server',               status: 'pending'},
      {label: 'Fetching model list',                  status: 'pending'},
      {label: `Testing prompt with ${capturedModel}`, status: 'pending'},
    ];
    setTestSteps([...steps]);

    const ollama = new OllamaClient(ollamaUrl, capturedModel);

    // Step 1: reachability check
    steps[0] = {...steps[0], status: 'running'};
    setTestSteps([...steps]);

    let modelNames: string[] = [];
    const t0 = Date.now();
    try {
      modelNames = await ollama.listModels();
      steps[0] = {...steps[0], status: 'pass', detail: 'Ollama is reachable', elapsedMs: Date.now() - t0};
    } catch (err) {
      steps[0] = {...steps[0], status: 'fail', detail: (err as Error).message, elapsedMs: Date.now() - t0};
      setTestSteps([...steps]);
      setConnectionStatus('error');
      setIsTesting(false);
      return;
    }

    // Step 2: model list check
    steps[1] = {...steps[1], status: 'running'};
    setTestSteps([...steps]);

    const modelCount        = modelNames.length;
    const hasConfiguredModel = modelNames.includes(capturedModel);

    if (modelCount === 0) {
      steps[1] = {...steps[1], status: 'fail', detail: 'No models installed'};
    } else if (!hasConfiguredModel) {
      steps[1] = {
        ...steps[1], status: 'pass',
        detail: `${modelCount} model${modelCount !== 1 ? 's' : ''} found — "${capturedModel}" not in list`,
      };
    } else {
      steps[1] = {
        ...steps[1], status: 'pass',
        detail: `${modelCount} model${modelCount !== 1 ? 's' : ''} found`,
      };
    }
    setTestSteps([...steps]);

    // Step 3: prompt test
    steps[2] = {...steps[2], status: 'running'};
    setTestSteps([...steps]);

    const t2 = Date.now();
    try {
      const reply   = await ollama.testPrompt();
      const preview = reply.trim().slice(0, 80);
      steps[2] = {
        ...steps[2], status: 'pass', elapsedMs: Date.now() - t2,
        detail: preview ? `"${preview}"` : 'Model responded',
      };
    } catch (err) {
      steps[2] = {...steps[2], status: 'fail', detail: (err as Error).message, elapsedMs: Date.now() - t2};
    }

    setTestSteps([...steps]);
    setConnectionStatus(steps.every(s => s.status === 'pass') ? 'connected' : 'error');
    setIsTesting(false);
  };

  return (
    <div style={cardStyle}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={cardHeaderStyle}>
        <div style={headerLeftStyle}>
          <ServerIcon />
          <span style={headerTitleStyle}>Ollama Connection</span>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={cardBodyStyle}>

        {/* Server endpoint sub-card */}
        <div style={subCardStyle}>
          <div style={subCardLabelStyle}>
            Server Endpoint
            <div style={labelLineStyle} />
          </div>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <input
              id="ai-pref-ollama-url"
              type="text"
              style={urlInputStyle}
              value={ollamaUrl}
              onChange={e => setField('ollamaUrl', e.target.value)}
              placeholder="http://localhost:11434"
            />
            <button
              style={btnMiniStyle}
              onClick={() => void handleGetModels()}
              disabled={isLoadingModels}
            >
              {isLoadingModels ? '◌ Loading…' : '⟳ Get Models'}
            </button>
          </div>
          <UrlBreakdown parsed={parsedUrl} />
        </div>

        {/* Active model sub-card */}
        <div style={subCardStyle}>
          <div style={subCardLabelStyle}>
            Active Model
            <div style={labelLineStyle} />
          </div>
          {knownModels.length > 0 ? (
            <ModelTableDropdown
              models={knownModels}
              selectedName={ollamaModel}
              onSelect={name => setField('ollamaModel', name)}
            />
          ) : (
            <input
              id="ai-pref-ollama-model"
              type="text"
              style={modelInputStyle}
              value={ollamaModel}
              onChange={e => setField('ollamaModel', e.target.value)}
              placeholder="qwen3.6:35b"
            />
          )}
          <ModelCaps model={selectedModelInfo} />
        </div>

        {/* Action row */}
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          <button style={btnPrimaryStyle} onClick={() => void handleSave()}>
            Save Settings
          </button>
          <button style={btnSecondaryStyle} onClick={() => void handleTest()} disabled={isTesting}>
            {isTesting ? '◌ Testing…' : '◎ Test Connection'}
          </button>
        </div>

        {/* Test results */}
        {testSteps !== null && <TestResultsPanel steps={testSteps} />}
      </div>
    </div>
  );
};
