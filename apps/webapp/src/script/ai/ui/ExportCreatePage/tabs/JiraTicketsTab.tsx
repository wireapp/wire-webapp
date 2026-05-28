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

import {useLiveQuery} from 'dexie-react-hooks';

import {useAi} from 'src/script/ai';
import type {JiraTicketRecord} from 'src/script/ai/storage/records';

import {itemRowStyle, itemRowSelectedStyle, checkboxStyle, itemTitleStyle, itemDescStyle, emptyStyle} from '../ExportCreatePage.styles';
import {JiraLinkText} from '../../shared/JiraLinkText';

interface JiraTicketsTabProps {
  selected_keys: Set<string>;
  on_toggle: (key: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'blue-grey': '#9fa1a7',
  'yellow': '#fcd34d',
  'green': '#4ade80',
  'red': '#f87171',
};

const keyStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#60a5fa',
  fontFamily: "'JetBrains Mono', Consolas, monospace",
  letterSpacing: '0.04em',
  marginRight: '8px',
};

const statusChipStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.68rem',
  padding: '1px 7px',
  borderRadius: '4px',
  background: `${STATUS_COLORS[color] ?? '#9fa1a7'}22`,
  color: STATUS_COLORS[color] ?? '#9fa1a7',
  border: `1px solid ${STATUS_COLORS[color] ?? '#9fa1a7'}44`,
  marginRight: '6px',
});

const IN_PROGRESS_COLOR = 'yellow';

/**
 * Tab 2: Jira tickets. In-progress tickets (yellow status) listed first.
 */
export const JiraTicketsTab = ({selected_keys, on_toggle}: JiraTicketsTabProps) => {
  const {jiraStorage} = useAi();
  const all_tickets = useLiveQuery(() => jiraStorage.getAllTickets(), []) ?? [];

  const sorted: JiraTicketRecord[] = [
    ...all_tickets.filter(t => t.status_category_color === IN_PROGRESS_COLOR),
    ...all_tickets.filter(t => t.status_category_color !== IN_PROGRESS_COLOR),
  ];

  if (sorted.length === 0) {
    return <div style={emptyStyle}>No Jira tickets synced yet.</div>;
  }

  return (
    <div>
      {sorted.map(ticket => {
        const selected = selected_keys.has(ticket.key);

        return (
          <div
            key={ticket.key}
            style={{...itemRowStyle, ...(selected ? itemRowSelectedStyle : {})}}
            onClick={() => on_toggle(ticket.key)}
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={e => e.key === ' ' && on_toggle(ticket.key)}
          >
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={selected}
              onChange={() => on_toggle(ticket.key)}
              onClick={e => e.stopPropagation()}
            />
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '3px'}}>
                <span style={keyStyle}>{ticket.key}</span>
                <span style={statusChipStyle(ticket.status_category_color)}>{ticket.status_name}</span>
                {ticket.priority_name && (
                  <span style={{...statusChipStyle('blue-grey')}}>{ticket.priority_name}</span>
                )}
              </div>
              <div style={itemTitleStyle}><JiraLinkText text={ticket.summary} /></div>
              {ticket.story_points !== null && (
                <div style={itemDescStyle}>{ticket.story_points} SP</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
