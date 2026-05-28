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

import {useAi} from 'src/script/ai';
import type {EntryLifecycleStatus} from 'src/script/ai/domain/EntryTypes';
import {navigate} from 'src/script/router/Router';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import type {
  AiConversationSubReportRecord,
  SubReportStatus,
} from 'src/script/ai/storage/records/AiConversationSubReportRecord';
import {getLogger} from 'Util/logger';

import {ConversationAvatarById} from '../shared/ConversationAvatarById';
import {EntryCard} from '../shared/EntryCard';

const log = getLogger('AI/ConversationSubReportView');

const STATUS_COLORS: Record<SubReportStatus, string> = {
  pending: '#6b7280',
  running: '#3b82f6',
  done:    '#22c55e',
  failed:  '#ef4444',
  skipped: '#f59e0b',
};

const STATUS_BG: Record<SubReportStatus, string> = {
  pending: '#1f2937',
  running: '#1e3a5f',
  done:    '#14532d',
  failed:  '#450a0a',
  skipped: '#451a03',
};

const wrapperStyle: React.CSSProperties = {
  border: '1px solid #374151',
  borderRadius: '10px',
  marginBottom: '12px',
  backgroundColor: '#0f172a',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  backgroundColor: '#1e293b',
  borderBottom: '1px solid #334155',
  gap: '10px',
};

const cardHeaderLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  minWidth: 0,
  flex: 1,
};

const cardHeaderRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexShrink: 0,
};

const cardBodyStyle: React.CSSProperties = {
  padding: '12px 14px',
};

const nameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#e2e8f0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const badgeStyle = (status: SubReportStatus): React.CSSProperties => ({
  backgroundColor: STATUS_BG[status],
  color: STATUS_COLORS[status],
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  border: `1px solid ${STATUS_COLORS[status]}33`,
});

const reusedBadgeStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  color: '#64748b',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  border: '1px solid #334155',
};

const tokenTagStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#94a3b8',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: 500,
  border: '1px solid #334155',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
};

const retryButtonStyle: React.CSSProperties = {
  padding: '2px 10px',
  fontSize: '0.75rem',
  backgroundColor: '#1d4ed8',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  color: '#fca5a5',
  fontSize: '0.82rem',
  backgroundColor: '#450a0a',
  border: '1px solid #7f1d1d',
  borderRadius: '6px',
  padding: '8px 12px',
};

const emptyStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: '0.85rem',
  fontStyle: 'italic',
  padding: '4px 0',
};

const runningDotsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#60a5fa',
  fontSize: '0.82rem',
  padding: '4px 0',
};

interface ConversationSubReportViewProps {
  subReport: AiConversationSubReportRecord;
}

/**
 * Shows a single conversation sub-report: name, status badge, error (if any),
 * and when done, its entries as EntryCards with per-entry accept/hide controls.
 */
export const ConversationSubReportView = ({subReport}: ConversationSubReportViewProps) => {
  const {aiStorage, scanRunner} = useAi();
  const {conversation_id, conversation_domain, conversation_name_snapshot, status, entries, error, reused_from_sub_report_id, id, stats} = subReport;
  const [retrying, setRetrying] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);

  const handleEntryStatusChange = async (entryId: string, next: EntryLifecycleStatus) => {
    try {
      await aiStorage.updateSubReportEntryStatus(id, entryId, next);
    } catch (e) {
      log.error('Failed to update sub-report entry status', id, entryId, e);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await scanRunner.retrySingleSubReport(id);
    } catch (e) {
      log.error('Retry request failed', id, e);
    } finally {
      setRetrying(false);
    }
  };

  const hasBody =
    !!error ||
    status === 'running' ||
    (status === 'done' && entries.length === 0) ||
    (status === 'done' && entries.length > 0);

  return (
    <div style={wrapperStyle}>
      {/* Card header — avatar + name left, badges right */}
      <div style={cardHeaderStyle} onMouseEnter={() => setHeaderHovered(true)} onMouseLeave={() => setHeaderHovered(false)}>
        <div style={cardHeaderLeftStyle}>
          <ConversationAvatarById conversationId={conversation_id} conversationDomain={conversation_domain} />
          <span style={nameStyle}>{conversation_name_snapshot || '(Unnamed conversation)'}</span>
        </div>
        <div style={cardHeaderRightStyle}>
          {headerHovered && stats.raw_token_estimate > 0 && (
            <span style={tokenTagStyle} title={`Sent to LLM: ${stats.truncated_token_estimate.toLocaleString()} tokens`}>
              {stats.raw_token_estimate !== stats.truncated_token_estimate
                ? `${stats.truncated_token_estimate.toLocaleString()} / ${stats.raw_token_estimate.toLocaleString()} tk`
                : `${stats.raw_token_estimate.toLocaleString()} tk`}
            </span>
          )}
          {reused_from_sub_report_id && (
            <span style={reusedBadgeStyle} title="Carried over from a previous scan — no new messages since then">
              reused
            </span>
          )}
          <span style={badgeStyle(status)}>{status}</span>
          {status === 'failed' && (
            <button style={retryButtonStyle} onClick={() => void handleRetry()} disabled={retrying}>
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      </div>

      {/* Card body — only rendered when there is content to show */}
      {hasBody && (
        <div style={cardBodyStyle}>
          {error && (
            <div style={errorStyle}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {status === 'running' && (
            <div style={runningDotsStyle}>
              <style>{`@keyframes ai-pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    display: 'inline-block',
                  }}
                />
              ))}
              <span>Scanning…</span>
            </div>
          )}

          {status === 'done' && entries.length === 0 && (
            <div style={emptyStyle}>No entries extracted from this conversation.</div>
          )}

          {status === 'done' &&
            entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                entryStatus={subReport.entry_statuses?.[entry.id] ?? 'pending'}
                onStatusChange={next => void handleEntryStatusChange(entry.id, next)}
                onNavigate={
                  entry.source_timestamp
                    ? () =>
                        navigate(
                          generateConversationUrl({
                            id: conversation_id,
                            domain: conversation_domain ?? '',
                          }),
                        )
                    : undefined
                }
                navigateTimestamp={entry.source_timestamp}
              />
            ))}
        </div>
      )}
    </div>
  );
};
