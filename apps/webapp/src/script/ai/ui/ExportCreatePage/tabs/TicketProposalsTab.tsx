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

import type {AiFinalReportEntryRecord} from 'src/script/ai/storage/records';

import {itemRowStyle, itemRowSelectedStyle, checkboxStyle, itemTitleStyle, itemDescStyle, emptyStyle} from '../ExportCreatePage.styles';
import {JiraLinkText} from '../../shared/JiraLinkText';

interface TicketProposalsTabProps {
  entries: AiFinalReportEntryRecord[];
  selected_ids: Set<string>;
  on_toggle: (id: string) => void;
}

/** Tab 5: AI-proposed ticket drafts (type='ticket') from the latest finished report. */
export const TicketProposalsTab = ({entries, selected_ids, on_toggle}: TicketProposalsTabProps) => {
  const ticket_entries = entries.filter(e => e.type === 'ticket');

  if (ticket_entries.length === 0) {
    return <div style={emptyStyle}>No ticket proposals found in the latest report.</div>;
  }

  return (
    <div>
      {ticket_entries.map(entry => {
        const selected = selected_ids.has(entry.id);
        const title = entry.mutable_state.title ?? (entry.payload.type === 'ticket' ? entry.payload.title : '(Ticket proposal)');
        const description = entry.mutable_state.description ?? (entry.payload.type === 'ticket' ? entry.payload.description : '');

        return (
          <div
            key={entry.id}
            style={{...itemRowStyle, ...(selected ? itemRowSelectedStyle : {})}}
            onClick={() => on_toggle(entry.id)}
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={e => e.key === ' ' && on_toggle(entry.id)}
          >
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={selected}
              onChange={() => on_toggle(entry.id)}
              onClick={e => e.stopPropagation()}
            />
            <div style={{flex: 1, minWidth: 0}}>
              <div style={itemTitleStyle}><JiraLinkText text={title} /></div>
              {description && <div style={itemDescStyle}><JiraLinkText text={description} /></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
