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

import type {AiConversationSubReportRecord} from 'src/script/ai/storage/records/AiConversationSubReportRecord';

import {ConversationSubReportView} from '../ConversationSubReportView';

const emptyStyle: React.CSSProperties = {
  color: '#6b7280',
  fontStyle: 'italic',
  padding: '16px 0',
};

interface ConversationsTabProps {
  subReports: AiConversationSubReportRecord[];
}

/** Displays per-conversation sub-reports, each showing status and extracted entries. */
export const ConversationsTab = ({subReports}: ConversationsTabProps) => {
  if (subReports.length === 0) {
    return <div style={emptyStyle}>No conversation results available.</div>;
  }

  return (
    <div>
      {subReports.map(subReport => (
        <ConversationSubReportView key={subReport.id} subReport={subReport} />
      ))}
    </div>
  );
};
