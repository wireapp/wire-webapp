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

import type {ApplicationObservability} from '../observability/applicationObservability';
import type {ApplicationStartupReport} from '../observability/applicationStartupReport';
import {createNoopApplicationObservability} from '../observability/createNoopApplicationObservability';

export const dataDogApplicationStartupLogMessage = 'wire_app_startup';

type NoopDataDogBrowserLogs = {
  readonly datadogLogs: {
    readonly logger: {
      readonly info: (...values: readonly unknown[]) => void;
    };
  };
};

export function createDataDogApplicationStartupLogContext(
  report: ApplicationStartupReport,
): Readonly<Record<string, number | string>> {
  void report;
  return {};
}

export function createDataDogLogsApplicationObservability(): ApplicationObservability {
  return createNoopApplicationObservability();
}

export function importDataDogBrowserLogs(): Promise<NoopDataDogBrowserLogs> {
  return Promise.resolve({
    datadogLogs: {
      logger: {
        info(...values: readonly unknown[]): void {
          void values;
        },
      },
    },
  });
}
