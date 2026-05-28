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
import React, {useState} from 'react';

// Ours
import {useAi} from 'src/script/ai';
import {useAiSettingsDraftStore} from 'src/script/ai/stores/useAiSettingsDraftStore';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/JiraSection');

// ─── Shared card styles (mirrored from OllamaConnectionSection) ───────────────

const cardStyle: React.CSSProperties = {
  border:       '1px solid #34373d',
  borderRadius: '10px',
  overflow:     'visible',
  background:   '#26272c',
  boxShadow:    '0 2px 12px rgba(0,0,0,0.3)',
  marginBottom: '32px',
};

const cardHeaderStyle: React.CSSProperties = {
  background:     '#1f2023',
  borderBottom:   '1px solid #34373d',
  borderRadius:   '10px 10px 0 0',
  padding:        '13px 20px',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
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
};

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

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '7px 10px',
  background:   '#000',
  border:       '1px solid #34373d',
  borderRadius: '5px',
  color:        '#fff',
  fontSize:     '0.82rem',
  fontFamily:   "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  boxSizing:    'border-box' as const,
  outline:      'none',
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
  padding:       '7px 18px',
  background:    '#26272c',
  color:         '#9fa1a7',
  border:        '1px solid #34373d',
  borderRadius:  '6px',
  cursor:        'pointer',
  fontWeight:    600,
  fontSize:      '0.8rem',
  letterSpacing: '0.02em',
};

const hintStyle: React.CSSProperties = {
  fontSize:   '0.72rem',
  color:      '#676b71',
  marginTop:  '6px',
  lineHeight: 1.4,
};

// ─── Icon ─────────────────────────────────────────────────────────────────────

const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{flexShrink: 0}}>
    <circle cx="5.5" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
    <line x1="8.5" y1="7.5" x2="13.5" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="11.5" y1="7.5" x2="11.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="13.5" y1="7.5" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

// ─── Test result banner ───────────────────────────────────────────────────────

type TestStatus = 'idle' | 'loading' | 'ok' | 'error';

interface TestResult {
  status: TestStatus;
  message: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** AI Preferences section for configuring the Jira API credentials. */
export const JiraSection = () => {
  const {aiSettings} = useAi();
  const {jiraEmail, jiraPat, setField} = useAiSettingsDraftStore();
  const [testResult, setTestResult] = useState<TestResult>({status: 'idle', message: ''});

  const handleSave = async () => {
    try {
      await Promise.all([aiSettings.setJiraEmail(jiraEmail), aiSettings.setJiraPat(jiraPat)]);
    } catch (err) {
      log.error('Failed to save Jira settings', err);
    }
  };

  const handleTest = async () => {
    if (!jiraEmail || !jiraPat) {
      setTestResult({status: 'error', message: 'Enter an email and API token first.'});
      return;
    }

    setTestResult({status: 'loading', message: 'Testing…'});

    try {
      const response = await fetch('/proxy/jira/rest/api/3/myself', {
        headers: {
          'X-Jira-Email': jiraEmail,
          'X-Jira-Token': jiraPat,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        setTestResult({status: 'error', message: `Auth failed (${response.status}): ${text.slice(0, 120)}`});
        return;
      }

      const data = await response.json() as {displayName?: string; emailAddress?: string};
      setTestResult({
        status: 'ok',
        message: `Connected as ${data.displayName ?? data.emailAddress ?? 'unknown user'}`,
      });
    } catch (err) {
      setTestResult({status: 'error', message: (err as Error).message});
    }
  };

  const testBannerStyle: React.CSSProperties = {
    padding:      '8px 12px',
    borderRadius: '6px',
    fontSize:     '0.78rem',
    fontWeight:   500,
    lineHeight:   1.4,
    ...(testResult.status === 'ok'
      ? {background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80'}
      : testResult.status === 'error'
        ? {background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5'}
        : {background: 'rgba(255,255,255,0.04)', border: '1px solid #34373d', color: '#9fa1a7'}),
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={headerLeftStyle}>
          <KeyIcon />
          <span style={headerTitleStyle}>Jira Connection</span>
        </div>
      </div>

      <div style={cardBodyStyle}>
        <div style={subCardStyle}>
          <div style={subCardLabelStyle}>
            Atlassian Account Email
            <div style={labelLineStyle} />
          </div>
          <input
            type="email"
            style={inputStyle}
            value={jiraEmail}
            onChange={e => setField('jiraEmail', e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div style={subCardStyle}>
          <div style={subCardLabelStyle}>
            API Token
            <div style={labelLineStyle} />
          </div>
          <input
            type="password"
            style={inputStyle}
            value={jiraPat}
            onChange={e => setField('jiraPat', e.target.value)}
            placeholder="Atlassian API token"
          />
          <div style={hintStyle}>
            Generate a token at <strong>id.atlassian.com → Security → API tokens</strong>.
          </div>
        </div>

        {testResult.status !== 'idle' && (
          <div style={testBannerStyle}>{testResult.message}</div>
        )}

        <div style={{display: 'flex', gap: '8px'}}>
          <button style={btnPrimaryStyle} onClick={() => void handleSave()}>
            Save Settings
          </button>
          <button
            style={{...btnSecondaryStyle, opacity: testResult.status === 'loading' ? 0.6 : 1}}
            disabled={testResult.status === 'loading'}
            onClick={() => void handleTest()}
          >
            {testResult.status === 'loading' ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  );
};
