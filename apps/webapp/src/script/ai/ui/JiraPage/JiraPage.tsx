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

import React from 'react';

import {navigate} from 'src/script/router/Router';
import {generateJiraTicketUrl, generateJiraUrl, generatePreferencesAiUrl} from 'src/script/router/routeGenerator';
import {useAppState} from 'src/script/page/useAppState';

import {JiraLinkText} from '../shared/JiraLinkText';

import {useJiraFix} from '../../jira/useJiraFix';
import {useJiraSync} from '../../jira/useJiraSync';
import {JiraIssueDetail} from './JiraIssueDetail';
import {ProblemPills} from './ProblemPills';

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {display:'flex', flexDirection:'column', height:'100%', background:'#17181a', overflow:'hidden'};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px 16px', borderBottom: '1px solid #34373d',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
};

const titleStyle: React.CSSProperties = {fontSize:'1rem', fontWeight:700, color:'#dce0e3', margin:0};
const subtitleStyle: React.CSSProperties = {fontSize:'0.72rem', color:'#676b71', marginTop:'2px'};
const bodyStyle: React.CSSProperties = {flex:1, overflowY:'auto', padding:'16px 24px'};

const issueCardStyle: React.CSSProperties = {
  background: '#26272c', border: '1px solid #34373d', borderRadius: '8px',
  padding: '12px 16px', marginBottom: '8px', cursor: 'pointer',
};

const issueKeyStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa',
  letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', Consolas, monospace",
};

const issueSummaryStyle: React.CSSProperties = {fontSize:'0.85rem', color:'#dce0e3', marginTop:'4px', lineHeight:1.4};
const issueMetaStyle: React.CSSProperties = {display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap', alignItems:'center'};

const btnBase: React.CSSProperties = {
  padding: '5px 14px', background: '#26272c', color: '#9fa1a7',
  border: '1px solid #34373d', borderRadius: '6px', cursor: 'pointer', fontSize: '0.77rem',
};
const btnSettings: React.CSSProperties = {...btnBase, color:'#60a5fa', borderColor:'#3b5998'};

const emptyStyle: React.CSSProperties = {textAlign:'center', color:'#676b71', padding:'48px 24px', fontSize:'0.85rem'};

const errorStyle: React.CSSProperties = {
  background:'rgba(239,68,68,0.08)', border:'1px solid rgba(248,113,113,0.25)',
  borderRadius:'8px', padding:'14px 16px', color:'#fca5a5', fontSize:'0.82rem', lineHeight:1.5,
};

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  'blue-grey': {bg:'rgba(99,115,129,0.2)',  text:'#9fa1a7'},
  'yellow':    {bg:'rgba(255,196,0,0.15)',  text:'#fcd34d'},
  'green':     {bg:'rgba(74,222,128,0.12)', text:'#4ade80'},
  'red':       {bg:'rgba(239,68,68,0.12)',  text:'#f87171'},
};

const StatusChip = ({colorName, name}: {colorName: string; name: string}) => {
  const c = STATUS_COLORS[colorName] ?? STATUS_COLORS['blue-grey'];
  return (
    <span style={{padding:'2px 8px', borderRadius:'10px', fontSize:'0.67rem', fontWeight:600, background:c.bg, color:c.text}}>
      {name}
    </span>
  );
};

const MetaChip = ({label, value}: {label: string; value: string}) => (
  <span style={{fontSize:'0.67rem', color:'#676b71'}}>
    <span style={{color:'#54585f'}}>{label}: </span>{value}
  </span>
);

// ─── Earth icon button ────────────────────────────────────────────────────────

const EarthIcon = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1C7.5 1 5 4 5 7.5C5 11 7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1C7.5 1 10 4 10 7.5C10 11 7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 7.5H14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.8 4.5H13.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.8 10.5H13.2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const JiraPage = () => {
  const {tickets, loading, error, isConfigured, refresh} = useJiraSync();
  const {fixTitle, fixStoryPoints, addComment} = useJiraFix(refresh);
  const activeJiraTicketKey = useAppState(state => state.activeJiraTicketKey);

  if (activeJiraTicketKey) {
    const selected_ticket = tickets.find(t => t.key === activeJiraTicketKey);
    return (
      <JiraIssueDetail
        issueKey={activeJiraTicketKey}
        onBack={() => navigate(generateJiraUrl())}
        onRefresh={refresh}
        problems={selected_ticket?.problems ?? []}
        currentSummary={selected_ticket?.summary}
      />
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Jira</h1>
          <div style={subtitleStyle}>Assigned to me · not done</div>
        </div>
        <div style={{display:'flex', gap:'8px'}}>
          <button style={btnSettings} onClick={() => navigate(generatePreferencesAiUrl())}>Settings</button>
          {isConfigured && (
            <button style={btnBase} onClick={() => void refresh()} disabled={loading}>
              {loading ? '◌ Loading…' : '⟳ Refresh'}
            </button>
          )}
        </div>
      </div>

      <div style={bodyStyle}>
        {isConfigured === false && (
          <div style={emptyStyle}>
            <div style={{fontSize:'1.5rem', marginBottom:'12px'}}>🔑</div>
            <div style={{marginBottom:'8px', color:'#9fa1a7'}}>Jira not configured</div>
            <div>Add your Atlassian email and API token in <strong>AI Preferences</strong>.</div>
            <button style={{...btnSettings, marginTop:'16px', display:'inline-block'}} onClick={() => navigate(generatePreferencesAiUrl())}>
              Open AI Preferences
            </button>
          </div>
        )}

        {error && (
          <div style={errorStyle}><strong>Failed to fetch tickets</strong><br />{error}</div>
        )}

        {isConfigured && !error && !loading && tickets.length === 0 && (
          <div style={emptyStyle}>No open tickets assigned to you.</div>
        )}

        {isConfigured && !error && loading && tickets.length === 0 && (
          <div style={emptyStyle}>Loading tickets…</div>
        )}

        {tickets.map(ticket => (
          <div
            key={ticket.key}
            style={issueCardStyle}
            onClick={() => navigate(generateJiraTicketUrl(ticket.key))}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#4a6fa5')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#34373d')}
          >
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={issueKeyStyle}>{ticket.key}</span>
              <a
                href={`https://wearezeta.atlassian.net/browse/${ticket.key}`}
                target="_blank"
                rel="noreferrer"
                title="Open in Jira"
                onClick={e => e.stopPropagation()}
                style={{
                  marginLeft:'auto', display:'flex', alignItems:'center', justifyContent:'center',
                  width:26, height:26, borderRadius:5, border:'1px solid #34373d',
                  color:'#676b71', textDecoration:'none', flexShrink:0,
                }}
              >
                <EarthIcon />
              </a>
            </div>

            <div style={issueSummaryStyle}><JiraLinkText text={ticket.summary} /></div>

            <div style={issueMetaStyle}>
              <StatusChip colorName={ticket.status_category_color} name={ticket.status_name} />
              {ticket.priority_name && <MetaChip label="P" value={ticket.priority_name} />}
              {ticket.story_points != null && <MetaChip label="pts" value={String(ticket.story_points)} />}
              <MetaChip
                label="updated"
                value={new Date(ticket.updated_at).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
              />
            </div>

            {ticket.problems.length > 0 && (
              <div style={{marginTop:8}}>
                <ProblemPills
                  problems={ticket.problems}
                  onFixTitle={async (area, product) => fixTitle(ticket.key, ticket.summary, area, product)}
                  onFixStoryPoints={async (points) => fixStoryPoints(ticket.key, points)}
                  onAddComment={async (text) => addComment(ticket.key, text)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
