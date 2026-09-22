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

import {
  createDataDogApplicationStartupLogContext,
  createDataDogLogsApplicationObservability,
  dataDogApplicationStartupLogMessage,
} from './createDataDogLogsApplicationObservability';

describe('createDataDogLogsApplicationObservability', () => {
  it('sends one startup log with a flattened allow-listed payload', async () => {
    const info = jest.fn();
    const applicationObservability = createDataDogLogsApplicationObservability({
      isDataDogLogsAvailable() {
        return true;
      },
      async importBrowserLogs() {
        return {datadogLogs: {logger: {info}}};
      },
    });

    await applicationObservability.reportApplicationStartup({
      result: 'success',
      lastStep: 'app_loaded',
      timings: {
        total_startup_duration_ms: 120,
        notification_processing_duration_ms: 40,
        app_usable_ms: 120,
      },
      statistics: {
        result: 'success',
        last_step: 'app_loaded',
        notification_count: 3,
        connection_count_bucket: '1-10',
        conversation_count_bucket: '101-500',
        client_count_bucket: '2-5',
        client_type: 'permanent',
      },
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(dataDogApplicationStartupLogMessage, {
      event: dataDogApplicationStartupLogMessage,
      result: 'success',
      'startup.total_duration_ms': 120,
      'startup.notification_processing_duration_ms': 40,
      'startup.notification_count': 3,
      'startup.connection_count_bucket': '1-10',
      'startup.conversation_count_bucket': '101-500',
      'startup.client_count_bucket': '2-5',
      'startup.client_type': 'permanent',
      'startup.last_step': 'app_loaded',
    });
  });

  it('does not include unsafe or non-allow-listed fields', () => {
    const logContext = createDataDogApplicationStartupLogContext({
      result: 'failure',
      timings: {
        total_startup_duration_ms: 150,
        notification_processing_duration_ms: Number.NaN,
        backend_url: 1,
      },
      statistics: {
        result: 'failure',
        notification_count: 10,
        user_id: 'user-id',
        team_id: 'team-id',
        conversation_id: 'conversation-id',
        session_id: 'session-id',
        view_id: 'view-id',
        request_id: 'request-id',
        domain: 'example.invalid',
        url: 'https://example.invalid',
        backend_url: 'https://example.invalid',
        raw_error_message: 'raw error',
        message_content: 'hello',
      },
    });

    expect(logContext).toEqual({
      event: dataDogApplicationStartupLogMessage,
      result: 'failure',
      'startup.total_duration_ms': 150,
      'startup.notification_count': 10,
    });
  });

  it('does nothing when Datadog Logs are disabled', async () => {
    const importBrowserLogs = jest.fn();
    const applicationObservability = createDataDogLogsApplicationObservability({
      isDataDogLogsAvailable() {
        return false;
      },
      importBrowserLogs,
    });

    await expect(
      applicationObservability.reportApplicationStartup({
        result: 'success',
        timings: {},
        statistics: {},
      }),
    ).resolves.toBeUndefined();
    expect(importBrowserLogs).not.toHaveBeenCalled();
  });

  it('does not throw when importing Datadog Logs fails', async () => {
    const applicationObservability = createDataDogLogsApplicationObservability({
      isDataDogLogsAvailable() {
        return true;
      },
      async importBrowserLogs() {
        throw new Error('unavailable');
      },
    });

    await expect(
      applicationObservability.reportApplicationStartup({
        result: 'failure',
        timings: {},
        statistics: {result: 'failure'},
      }),
    ).resolves.toBeUndefined();
  });
});
