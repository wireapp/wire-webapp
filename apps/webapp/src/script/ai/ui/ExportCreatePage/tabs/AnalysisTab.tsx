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

import {format} from 'date-fns';

import type {AiFinalReportEntryRecord} from 'src/script/ai/storage/records';

import {itemRowStyle, itemRowSelectedStyle, checkboxStyle, itemTitleStyle, itemDescStyle, emptyStyle} from '../ExportCreatePage.styles';
import {JiraLinkText} from '../../shared/JiraLinkText';

interface AnalysisTabProps {
  entries: AiFinalReportEntryRecord[];
  selected_ids: Set<string>;
  on_toggle: (id: string) => void;
}

/** Tab 3: Analysis entries (type='report') from the latest finished report. */
export const AnalysisTab = ({entries, selected_ids, on_toggle}: AnalysisTabProps) => {
  const report_entries = entries.filter(e => e.type === 'report');

  if (report_entries.length === 0) {
    return <div style={emptyStyle}>No analysis entries found in the latest report.</div>;
  }

  return (
    <div>
      {report_entries.map(entry => {
        const selected = selected_ids.has(entry.id);
        const payload = entry.payload;

        const title =
          payload.type === 'report'
            ? `${format(new Date(payload.start), 'PP')} – ${format(new Date(payload.end), 'PP')}`
            : '(Analysis entry)';

        const description = payload.type === 'report' ? payload.description : '';

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
