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

import type {AiFinalReportEntryRecord} from 'src/script/ai/storage/records/AiFinalReportEntryRecord';
import {navigate} from 'src/script/router/Router';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {getLogger} from 'Util/logger';

import {EntryCard} from '../../shared/EntryCard';

const log = getLogger('AI/TicketsTab');

const emptyStyle: React.CSSProperties = {
  color: '#6b7280',
  fontStyle: 'italic',
  padding: '16px 0',
};

const ticketWrapperStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const copyButtonStyle: React.CSSProperties = {
  marginTop: '6px',
  padding: '4px 10px',
  fontSize: '0.75rem',
  backgroundColor: '#374151',
  color: '#d1d5db',
  border: '1px solid #4b5563',
  borderRadius: '4px',
  cursor: 'pointer',
};

interface TicketsTabProps {
  entries: AiFinalReportEntryRecord[];
}

/** Displays all 'ticket' type final entries as EntryCards, each with a "Copy as Jira" button. */
export const TicketsTab = ({entries}: TicketsTabProps) => {
  const ticketEntries = entries.filter(e => e.type === 'ticket');

  if (ticketEntries.length === 0) {
    return <div style={emptyStyle}>No ticket drafts found.</div>;
  }

  const copyAsJira = (record: AiFinalReportEntryRecord) => {
    if (record.payload.type !== 'ticket') {
      return;
    }

    const title = record.mutable_state?.title ?? record.payload.title;
    const description = record.mutable_state?.description ?? record.payload.description;
    const notes = record.mutable_state?.notes ?? '';

    const text = notes ? `## ${title}\n\n${description}\n\nNotes: ${notes}` : `## ${title}\n\n${description}`;

    navigator.clipboard.writeText(text).catch((error: unknown) => {
      log.error('Failed to copy ticket to clipboard', error);
    });
  };

  const handleNavigate = (record: AiFinalReportEntryRecord) => {
    const first_ref = record.source_refs?.[0];
    if (!first_ref) return;
    navigate(generateConversationUrl({id: first_ref.conversation_id, domain: first_ref.domain ?? ''}));
  };

  return (
    <div>
      {ticketEntries.map(record => (
        <div key={record.id} style={ticketWrapperStyle}>
          <EntryCard
            record={record}
            onNavigate={record.source_refs?.length ? () => handleNavigate(record) : undefined}
            navigateTimestamp={record.source_refs?.[0]?.timestamp}
          />
          <button style={copyButtonStyle} onClick={() => copyAsJira(record)}>
            Copy as Jira
          </button>
        </div>
      ))}
    </div>
  );
};
