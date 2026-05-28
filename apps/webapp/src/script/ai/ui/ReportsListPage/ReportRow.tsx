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

import * as ContextMenu from '@radix-ui/react-context-menu';
import {format} from 'date-fns';
import {useLiveQuery} from 'dexie-react-hooks';

import {useAppNotification} from 'Components/AppNotification';
import {useAi} from 'src/script/ai';
import type {ReportStatus} from 'src/script/ai/domain/ReportStatus';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';
import type {AiReportRecord} from 'src/script/ai/storage/records/AiReportRecord';
import {generateReportDetailUrl} from 'src/script/router/routeGenerator';
import {navigate} from 'src/script/router/Router';
import {getLogger} from 'Util/logger';

import {styles} from './ReportsListPage.styles';

import {ProgressBar} from '../shared/ProgressBar';

const log = getLogger('AI/ReportRow');

const STATUS_COLORS: Record<ReportStatus, string> = {
  scanning: '#3b82f6',
  finished: '#22c55e',
  interrupted: '#f59e0b',
  failed: '#ef4444',
};

const StatusBadge = ({status}: {status: ReportStatus}) => (
  <span
    style={{
      backgroundColor: STATUS_COLORS[status],
      color: '#fff',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}
  >
    {status}
  </span>
);

interface ReportRowProps {
  report: AiReportRecord;
}

/** A single table row in the Reports list. The entire row is clickable to open the report detail page. */
export const ReportRow = ({report}: ReportRowProps) => {
  const {aiStorage, scanRunner} = useAi();
  const [isResuming, setIsResuming] = useState(false);
  const notification = useAppNotification();

  const subReports =
    useLiveQuery(
      () => (report.status === 'scanning' ? aiStorage.listSubReports(report.id) : Promise.resolve([])),
      [report.id, report.status],
    ) ?? [];

  const total = report.target_conversation_ids.length;
  const done = subReports.filter(subReport => subReport.status === 'done').length;

  const handleNavigate = () => navigate(generateReportDetailUrl(report.id));

  const handleResume = async (event: React.MouseEvent) => {
    // Prevent the row click from also navigating when resuming.
    event.stopPropagation();
    setIsResuming(true);
    try {
      await scanRunner.resume(report.id);
    } catch (error) {
      if (error instanceof OllamaUnreachableError) {
        notification.show({message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.'});
      } else if (error instanceof OllamaModelMissingError) {
        notification.show({
          message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
        });
      } else {
        log.error('Unexpected error in ReportRow resume:', error);
      }
    } finally {
      setIsResuming(false);
    }
  };

  const handleChevronClick = (event: React.MouseEvent) => {
    // Stop propagation so the row onClick doesn't fire a second time.
    event.stopPropagation();
    handleNavigate();
  };

  const handleDelete = async () => {
    try {
      await aiStorage.deleteReport(report.id);
    } catch (error) {
      log.error('Unexpected error deleting report:', error);
      notification.show({message: 'Failed to delete report. Please try again.'});
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <tr className={styles.row} onClick={handleNavigate}>
          <td className={styles.rowTitle}>{format(new Date(report.created_at), 'PP p')}</td>
          <td>
            <StatusBadge status={report.status} />
          </td>
          <td className={styles.rowMiddle}>
            {report.status === 'scanning' && <ProgressBar done={done} total={total} />}
          </td>
          <td>
            <div className={styles.rowRight}>
              {report.status === 'interrupted' && (
                <button className={styles.rowResume} onClick={handleResume} disabled={isResuming}>
                  {isResuming ? 'Resuming...' : 'Resume'}
                </button>
              )}
              <button onClick={handleChevronClick} aria-label="View report details" className={styles.rowChevron}>
                ›
              </button>
            </div>
          </td>
        </tr>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={styles.contextMenuContent}>
          <ContextMenu.Item className={styles.contextMenuItemDestructive} onSelect={handleDelete}>
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};
