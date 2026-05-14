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

import {ReportRow} from './ReportRow';
import {ScanButton} from './ScanButton';

/** Reports list page — the entry point of the AI scanning feature. Subscribes live to all reports via useLiveQuery. */
export const ReportsListPage = () => {
  const {aiStorage} = useAi();
  const reports = useLiveQuery(() => aiStorage.listReports(), []) ?? [];

  return (
    <div className="reports-list-page">
      <div className="reports-list-page__header">
        <h1>Reports</h1>
        <ScanButton reports={reports} />
      </div>
      {reports.length === 0 ? (
        <div className="reports-list-page__empty">
          No reports yet. Click <strong>Scan</strong> to generate one.
        </div>
      ) : (
        <ul className="reports-list-page__list">
          {reports.map(r => (
            <li key={r.id}>
              <ReportRow report={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
