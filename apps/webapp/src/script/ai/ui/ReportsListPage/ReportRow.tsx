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
import {useLiveQuery} from 'dexie-react-hooks';

import {useAi} from 'src/script/ai';
import type {ReportStatus} from 'src/script/ai/domain/ReportStatus';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';
import type {AiReportRecord} from 'src/script/ai/storage/records';
import {PrimaryModal} from 'src/script/components/Modals/PrimaryModal';
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

interface ReportRowProps {
  report: AiReportRecord;
}

interface StatusBadgeProps {
  status: ReportStatus;
}

const StatusBadge = ({status}: StatusBadgeProps) => (
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

/** A single row in the Reports list. Shows date title, status badge, optional live progress bar (while scanning), and navigation controls. */
export const ReportRow = ({report}: ReportRowProps) => {
  const {aiStorage, scanRunner} = useAi();
  const subReports =
    useLiveQuery(
      () => (report.status === 'scanning' ? aiStorage.listSubReports(report.id) : Promise.resolve([])),
      [report.id, report.status],
    ) ?? [];

  const total = report.target_conversation_ids.length;
  const done = subReports.filter(s => s.status === 'done').length;

  const handleResume = async () => {
    try {
      await scanRunner.resume(report.id);
    } catch (error) {
      if (error instanceof OllamaUnreachableError) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            title: 'Ollama Error',
            message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.',
          },
        });
      } else if (error instanceof OllamaModelMissingError) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            title: 'Model Error',
            message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
          },
        });
      } else {
        log.error('Unexpected error in ReportRow.handleResume', error);
      }
    }
  };

  return (
    <div className={styles.row} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '12px'}}>
      <div className={styles.rowLeft} style={{flex: '0 0 auto'}}>
        <span className={styles.rowTitle} style={{display: 'block', marginBottom: '8px'}}>
          Report from {format(new Date(report.created_at), 'PP p')}
        </span>
        <StatusBadge status={report.status} />
      </div>

      {report.status === 'scanning' && (
        <div className={styles.rowMiddle} style={{flex: '1'}}>
          <ProgressBar done={done} total={total} />
        </div>
      )}

      <div className={styles.rowRight} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        {report.status === 'interrupted' && (
          <button
            className={styles.rowResume}
            onClick={handleResume}
            style={{padding: '4px 8px', fontSize: '0.875rem'}}
          >
            Resume
          </button>
        )}
        <button
          className={styles.rowChevron}
          onClick={() => navigate(generateReportDetailUrl(report.id))}
          aria-label="View report details"
          style={{padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem'}}
        >
          ›
        </button>
      </div>
    </div>
  );
};
