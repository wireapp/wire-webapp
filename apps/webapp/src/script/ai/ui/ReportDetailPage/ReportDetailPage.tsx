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

import {useState} from 'react';

import {format} from 'date-fns';
import {useLiveQuery} from 'dexie-react-hooks';

import {useAi} from 'src/script/ai';
import {useAppState} from 'src/script/page/useAppState';
import {navigate} from 'src/script/router/Router';

import {ConversationsTab} from './tabs/ConversationsTab';
import {ReportTab} from './tabs/ReportTab';
import {TicketsTab} from './tabs/TicketsTab';
import {TodosTab} from './tabs/TodosTab';

type TabId = 'analysis' | 'todos' | 'tickets';

const TABS: {id: TabId; label: string}[] = [
  {id: 'analysis', label: 'Analysis'},
  {id: 'todos', label: 'Todos'},
  {id: 'tickets', label: 'Tickets'},
];

const pageStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '800px',
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
};

const headerLeftStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#60a5fa',
  cursor: 'pointer',
  padding: '0',
  fontSize: '0.85rem',
  marginBottom: '8px',
  display: 'block',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 700,
  marginBottom: '4px',
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9ca3af',
};

const tabListStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  borderBottom: '1px solid #374151',
  marginBottom: '20px',
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
  color: active ? '#60a5fa' : '#9ca3af',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '0.9rem',
  marginBottom: '-1px',
});

const notFoundStyle: React.CSSProperties = {
  color: '#9ca3af',
  padding: '24px',
};

/** Toolbar container — right-aligned, sits in the header row. */
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
  paddingTop: '2px',
};

const toolbarButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  background: active ? '#1e3a5f' : 'none',
  border: active ? '1px solid #3b82f6' : '1px solid #374151',
  borderRadius: '6px',
  color: active ? '#60a5fa' : '#9ca3af',
  cursor: 'pointer',
  padding: '0',
  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
});

const conversationsPanelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  marginBottom: '16px',
  paddingBottom: '14px',
  borderBottom: '1px solid #1e293b',
};

const conversationsPanelIconStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  backgroundColor: '#1e3a5f',
  border: '1px solid #2563eb33',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: '#60a5fa',
};

const conversationsPanelTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#f1f5f9',
  marginBottom: '3px',
  letterSpacing: '0.01em',
};

const conversationsPanelDescStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#64748b',
  lineHeight: '1.5',
};

/** Chat bubble icon for the conversations toolbar button. */
const ConversationsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h7A2.5 2.5 0 0 1 14 2.5v6A2.5 2.5 0 0 1 11.5 11H9l-3 3v-3H4.5A2.5 2.5 0 0 1 2 8.5v-6Z" />
  </svg>
);

/** Refresh/re-run icon for the re-run toolbar button. */
const RerunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a6 6 0 1 0 5.2 9H11.6a4.5 4.5 0 1 1 0-6.4V3.25l3 2.5-3 2.5V6.6A6 6 0 0 0 8 2Z" />
  </svg>
);

/** Spinner shown while re-run is in progress. */
const SpinnerIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{animation: 'spin 1s linear infinite'}}
  >
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <path d="M7 1.5a5.5 5.5 0 1 1-5.5 5.5" strokeLinecap="round" />
  </svg>
);

/**
 * Full-page view for a single AI scan report.
 *
 * Before the final pass: shows conversation sub-reports directly — no tabs, no analysis content yet.
 * After the final pass: shows Analysis / Todos / Tickets tabs plus a toolbar (top-right) with
 * access to the scanned conversations list and a re-run final pass button.
 */
export const ReportDetailPage = () => {
  const {aiStorage, scanRunner} = useAi();
  const reportId = useAppState(s => s.activeReportId);
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [rerunning, setRerunning] = useState(false);
  const [showConversationsPanel, setShowConversationsPanel] = useState(false);

  const report = useLiveQuery(
    () => (reportId ? aiStorage.getReport(reportId) : Promise.resolve(undefined)),
    [reportId],
  );

  const finalEntries =
    useLiveQuery(() => (reportId ? aiStorage.listFinalEntries(reportId) : Promise.resolve([])), [reportId]) ?? [];

  const subReports =
    useLiveQuery(() => (reportId ? aiStorage.listSubReports(reportId) : Promise.resolve([])), [reportId]) ?? [];

  if (!reportId || !report) {
    return <div style={notFoundStyle}>Report not found.</div>;
  }

  const handleBack = () => {
    navigate('/reports');
  };

  const handleRerunFinalPass = async () => {
    setRerunning(true);
    try {
      await scanRunner.rerunFinalPass(reportId);
    } finally {
      setRerunning(false);
    }
  };

  const createdAt = report.created_at ? format(new Date(report.created_at), 'PP p') : '';
  const finishedAt = report.finished_at ? format(new Date(report.finished_at), 'PP p') : null;

  /** True once the final-pass LLM step has completed and analysis tabs have content. */
  const finalPassDone = report.final_pass_finished_at !== null;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <button style={backButtonStyle} onClick={handleBack}>
            ← Back to Reports
          </button>
          <div style={titleStyle}>Report from {createdAt}</div>
          <div style={metaStyle}>
            Status: {report.status}
            {finishedAt && ` · Finished: ${finishedAt}`}
            {' · '}Model: {report.snapshot.model}
          </div>
        </div>

        {finalPassDone && (
          <div role="toolbar" aria-label="Report actions" style={toolbarStyle}>
            <button
              style={toolbarButtonStyle(showConversationsPanel)}
              aria-pressed={showConversationsPanel}
              title="Scanned conversations"
              onClick={() => setShowConversationsPanel(v => !v)}
            >
              <ConversationsIcon />
            </button>

            {report.status !== 'scanning' && (
              <button
                style={toolbarButtonStyle(false)}
                title={rerunning ? 'Running final pass…' : 'Re-run final pass'}
                onClick={() => void handleRerunFinalPass()}
                disabled={rerunning}
              >
                {rerunning ? <SpinnerIcon /> : <RerunIcon />}
              </button>
            )}
          </div>
        )}
      </div>

      {!finalPassDone ? (
        /* Before the final pass: show conversation scan progress directly — no tabs yet. */
        <ConversationsTab subReports={subReports} />
      ) : showConversationsPanel ? (
        /* Conversations panel: accessible via toolbar icon after the final pass. */
        <div>
          <div style={conversationsPanelHeaderStyle}>
            <div style={conversationsPanelIconStyle}>
              <ConversationsIcon />
            </div>
            <div>
              <div style={conversationsPanelTitleStyle}>Scanned Conversations</div>
              <div style={conversationsPanelDescStyle}>
                Conversations that were scanned to generate this report. Each card shows AI analysis findings from that
                conversation.
              </div>
            </div>
          </div>
          <ConversationsTab subReports={subReports} />
        </div>
      ) : (
        /* After the final pass: show Analysis / Todos / Tickets tabs. */
        <>
          <div style={tabListStyle} role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                style={tabButtonStyle(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {activeTab === 'analysis' && <ReportTab entries={finalEntries} />}
            {activeTab === 'todos' && <TodosTab entries={finalEntries} />}
            {activeTab === 'tickets' && <TicketsTab entries={finalEntries} />}
          </div>
        </>
      )}
    </div>
  );
};
