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

import {EntryCard} from '../../shared/EntryCard';

const emptyStyle: React.CSSProperties = {
  color: '#6b7280',
  fontStyle: 'italic',
  padding: '16px 0',
};

interface TodosTabProps {
  entries: AiFinalReportEntryRecord[];
}

/** Displays all 'todo' type final entries as checkable EntryCards. */
export const TodosTab = ({entries}: TodosTabProps) => {
  const todoEntries = entries.filter(e => e.type === 'todo');

  if (todoEntries.length === 0) {
    return <div style={emptyStyle}>No action items found.</div>;
  }

  const handleNavigate = (record: AiFinalReportEntryRecord) => {
    const first_ref = record.source_refs?.[0];
    if (!first_ref) return;
    navigate(generateConversationUrl({id: first_ref.conversation_id, domain: first_ref.domain ?? ''}));
  };

  return (
    <div>
      {todoEntries.map(record => (
        <EntryCard
          key={record.id}
          record={record}
          onNavigate={record.source_refs?.length ? () => handleNavigate(record) : undefined}
          navigateTimestamp={record.source_refs?.[0]?.timestamp}
        />
      ))}
    </div>
  );
};
