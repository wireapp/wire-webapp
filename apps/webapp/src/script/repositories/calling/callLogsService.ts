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

import type {Clock} from '@enormora/clock/clock';
import {Task, task} from 'true-myth';

export type CallLogsReport = {
  status: 'exported';
  file_name: string;
  bytes: number;
  participant_id: string;
  format: 'avs' | 'android-logcat' | 'ios-client';
  entries_exported: number;
  log_records_exported: number;
  participants_hashed: number;
  duration_ms: number;
  improvised_span_ids: number;
};

export type CallLogsErrorStatus = 400 | 409 | 413 | 422 | 502 | 500 | 'network';
export type CallLogsError = {status: CallLogsErrorStatus};
export type CallLogsRequest = {
  method: 'POST';
  url: string;
  body: FormData;
};
export type CallLogsTransport = (request: CallLogsRequest) => Task<CallLogsReport, CallLogsError>;
export type CallLogsService = {
  sendCallLogs: (file: File, options: {force: boolean}) => Task<CallLogsReport, CallLogsError>;
};

export const createCallLogsService = (transport: CallLogsTransport): CallLogsService => {
  return {
    sendCallLogs: (file, {force}) => {
      const body = new FormData();
      body.append('file', file);
      return transport({method: 'POST', url: force ? '/api/logs?force=true' : '/api/logs', body});
    },
  };
};

const MOCK_UPLOAD_DELAY_MILLISECONDS = 2_000;

// Simulates the API contract, including duplicate exports. No data leaves the browser.
// The export statistics are fixtures, not the result of parsing the supplied log.
export const createMockCallLogsService = (clock: Clock): CallLogsService => {
  const exportedFiles = new Set<string>();
  return createCallLogsService(request => {
    return task
      .fromPromise(
        new Promise<void>(resolve => {
          clock.setTimeout(resolve, MOCK_UPLOAD_DELAY_MILLISECONDS);
        }),
        (): CallLogsError => {
          return {status: 'network'};
        },
      )
      .andThen(() => {
        const file = request.body.get('file');
        if (!(file instanceof File) || file.size === 0) {
          return task.reject<CallLogsReport, CallLogsError>({status: 400});
        }
        if (exportedFiles.has(file.name) && !request.url.endsWith('?force=true')) {
          return task.reject<CallLogsReport, CallLogsError>({status: 409});
        }
        exportedFiles.add(file.name);
        return task.resolve<CallLogsReport, CallLogsError>({
          status: 'exported',
          file_name: file.name,
          bytes: file.size,
          participant_id: 'mock-client@mock-domain',
          format: 'avs',
          entries_exported: 1,
          log_records_exported: 1,
          participants_hashed: 0,
          duration_ms: MOCK_UPLOAD_DELAY_MILLISECONDS,
          improvised_span_ids: 0,
        });
      });
  });
};
