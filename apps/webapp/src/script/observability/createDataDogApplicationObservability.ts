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

export const dataDogApplicationStartupActionName = 'wire_app_startup';

const allowedTimingNames = [
  'app_bootstrap_started_ms',
  'dom_content_loaded_ms',
  'init_app_started_ms',
  'received_access_token_ms',
  'received_self_user_ms',
  'received_user_data_ms',
  'notification_processing_started_ms',
  'notification_processing_completed_ms',
  'notification_processing_duration_ms',
  'updated_from_notifications_ms',
  'ui_loaded_ms',
  'updated_conversations_ms',
  'app_pre_loaded_ms',
  'app_usable_ms',
  'total_startup_duration_ms',
] as const;

const allowedStatisticNames = [
  'notification_count',
  'connection_count_bucket',
  'conversation_count_bucket',
  'client_count_bucket',
  'client_type',
  'result',
  'last_step',
] as const;

type BrowserRum = {
  readonly addAction: (name: string, context?: DataDogApplicationStartupContext) => void;
};

type CreateDataDogApplicationObservabilityDependencies = {
  readonly importBrowserRum: () => Promise<{readonly datadogRum?: BrowserRum}>;
  readonly isDataDogAvailable: () => boolean;
};

type DataDogApplicationStartupContext = {
  readonly result: ApplicationStartupReport['result'];
  readonly last_step?: string;
  readonly timings: Readonly<Record<string, number>>;
  readonly statistics: Readonly<Record<string, number | string>>;
};

function pickAllowedTimings(timings: ApplicationStartupReport['timings']): Readonly<Record<string, number>> {
  return Object.fromEntries(
    allowedTimingNames.flatMap(timingName => {
      const timing = timings[timingName];

      return is.number(timing) && Number.isFinite(timing) ? [[timingName, timing]] : [];
    }),
  );
}

function pickAllowedStatistics(
  statistics: ApplicationStartupReport['statistics'],
): Readonly<Record<string, number | string>> {
  return Object.fromEntries(
    allowedStatisticNames.flatMap(statisticName => {
      const statistic = statistics[statisticName];
      const isSafeStatistic = is.string(statistic) || (is.number(statistic) && Number.isFinite(statistic));

      return isSafeStatistic ? [[statisticName, statistic]] : [];
    }),
  );
}

function createDataDogApplicationStartupContext(report: ApplicationStartupReport): DataDogApplicationStartupContext {
  return {
    result: report.result,
    last_step: report.lastStep,
    timings: pickAllowedTimings(report.timings),
    statistics: pickAllowedStatistics(report.statistics),
  };
}

export function createDataDogApplicationObservability(
  dependencies: CreateDataDogApplicationObservabilityDependencies,
): ApplicationObservability {
  const {importBrowserRum, isDataDogAvailable} = dependencies;

  try {
    if (!isDataDogAvailable()) {
      return createNoopApplicationObservability();
    }
  } catch {
    return createNoopApplicationObservability();
  }

  return {
    async reportApplicationStartup(report) {
      try {
        const {datadogRum} = await importBrowserRum();
        datadogRum?.addAction(dataDogApplicationStartupActionName, createDataDogApplicationStartupContext(report));
      } catch {
        // Application observability is best-effort only.
      }
    },
  };
}
