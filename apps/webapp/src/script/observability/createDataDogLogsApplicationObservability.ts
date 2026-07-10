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

import is from '@sindresorhus/is';

import type {ApplicationObservability} from './applicationObservability';
import type {ApplicationStartupReport} from './applicationStartupReport';
import {createNoopApplicationObservability} from './createNoopApplicationObservability';

export const dataDogApplicationStartupLogMessage = 'wire_app_startup';

type BrowserLogs = {
  readonly logger: {
    readonly info: (message: string, context?: DataDogApplicationStartupLogContext) => void;
  };
};

type CreateDataDogLogsApplicationObservabilityDependencies = {
  readonly importBrowserLogs: () => Promise<{readonly datadogLogs?: BrowserLogs}>;
  readonly isDataDogLogsAvailable: () => boolean;
};

type DataDogApplicationStartupLogContext = Readonly<Record<string, number | string>>;

function addFiniteNumber(
  logContext: Record<string, number | string>,
  logFieldName: string,
  value: number | undefined,
): void {
  if (is.number(value) && Number.isFinite(value)) {
    logContext[logFieldName] = value;
  }
}

function addSafeStringOrNumber(
  logContext: Record<string, number | string>,
  logFieldName: string,
  value: number | string | undefined,
): void {
  const isSafeValue = is.string(value) || (is.number(value) && Number.isFinite(value));

  if (isSafeValue) {
    logContext[logFieldName] = value;
  }
}

export function createDataDogApplicationStartupLogContext(
  report: ApplicationStartupReport,
): DataDogApplicationStartupLogContext {
  const logContext: Record<string, number | string> = {
    event: dataDogApplicationStartupLogMessage,
    result: report.result,
  };

  addFiniteNumber(logContext, 'startup.total_duration_ms', report.timings.total_startup_duration_ms);
  addFiniteNumber(
    logContext,
    'startup.notification_processing_duration_ms',
    report.timings.notification_processing_duration_ms,
  );
  addSafeStringOrNumber(logContext, 'startup.notification_count', report.statistics.notification_count);
  addSafeStringOrNumber(logContext, 'startup.connection_count_bucket', report.statistics.connection_count_bucket);
  addSafeStringOrNumber(logContext, 'startup.conversation_count_bucket', report.statistics.conversation_count_bucket);
  addSafeStringOrNumber(logContext, 'startup.client_count_bucket', report.statistics.client_count_bucket);
  addSafeStringOrNumber(logContext, 'startup.client_type', report.statistics.client_type);

  if (is.nonEmptyString(report.lastStep)) {
    logContext['startup.last_step'] = report.lastStep;
  } else {
    addSafeStringOrNumber(logContext, 'startup.last_step', report.statistics.last_step);
  }

  return logContext;
}

export function createDataDogLogsApplicationObservability(
  dependencies: CreateDataDogLogsApplicationObservabilityDependencies,
): ApplicationObservability {
  const {importBrowserLogs, isDataDogLogsAvailable} = dependencies;

  try {
    if (!isDataDogLogsAvailable()) {
      return createNoopApplicationObservability();
    }
  } catch {
    return createNoopApplicationObservability();
  }

  return {
    async reportApplicationStartup(report) {
      try {
        const {datadogLogs} = await importBrowserLogs();
        datadogLogs?.logger.info(
          dataDogApplicationStartupLogMessage,
          createDataDogApplicationStartupLogContext(report),
        );
      } catch {
        // Application observability is best-effort only.
      }
    },
  };
}

export function importDataDogBrowserLogs(): Promise<{readonly datadogLogs?: BrowserLogs}> {
  return import('@datadog/browser-logs');
}
