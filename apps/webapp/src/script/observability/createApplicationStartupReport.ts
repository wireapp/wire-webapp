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
import {Maybe} from 'true-myth';

import type {ApplicationStartupReport} from './applicationStartupReport';

import type {AppStatistics} from '../telemetry/app_init/AppInitStatistics';
import {AppInitStatisticsValue} from '../telemetry/app_init/AppInitStatisticsValue';
import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';

type StartupTimings = Partial<Record<AppInitTimingsStep, number>>;

type CreateApplicationStartupReportOptions = {
  readonly result: ApplicationStartupReport['result'];
  readonly timings: StartupTimings;
  readonly statistics: AppStatistics;
  readonly lastStep: Maybe<AppInitTimingsStep>;
};

function getTiming(timings: StartupTimings, timingStep: AppInitTimingsStep): Maybe<number> {
  const timing = timings[timingStep];
  return is.number(timing) && Number.isFinite(timing) ? Maybe.just(timing) : Maybe.nothing();
}

function createStartupTimings(timings: StartupTimings): ApplicationStartupReport['timings'] {
  const startupTimings: Record<string, number> = {
    app_bootstrap_started_ms: 0,
  };

  const timingMappings: ReadonlyArray<readonly [string, AppInitTimingsStep]> = [
    ['dom_content_loaded_ms', AppInitTimingsStep.DOM_CONTENT_LOADED],
    ['init_app_started_ms', AppInitTimingsStep.INIT_APP_STARTED],
    ['received_access_token_ms', AppInitTimingsStep.RECEIVED_ACCESS_TOKEN],
    ['received_self_user_ms', AppInitTimingsStep.RECEIVED_SELF_USER],
    ['received_user_data_ms', AppInitTimingsStep.RECEIVED_USER_DATA],
    ['notification_processing_started_ms', AppInitTimingsStep.NOTIFICATION_PROCESSING_STARTED],
    ['notification_processing_completed_ms', AppInitTimingsStep.NOTIFICATION_PROCESSING_COMPLETED],
    ['updated_from_notifications_ms', AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS],
    ['ui_loaded_ms', AppInitTimingsStep.UI_LOADED],
    ['updated_conversations_ms', AppInitTimingsStep.UPDATED_CONVERSATIONS],
    ['app_pre_loaded_ms', AppInitTimingsStep.APP_PRE_LOADED],
    ['app_usable_ms', AppInitTimingsStep.APP_LOADED],
  ];

  timingMappings.forEach(([reportTimingName, timingStep]) => {
    const timing = getTiming(timings, timingStep);
    if (timing.isJust) {
      startupTimings[reportTimingName] = timing.value;
    }
  });

  const notificationProcessingStartedAt = getTiming(timings, AppInitTimingsStep.NOTIFICATION_PROCESSING_STARTED);
  const notificationProcessingCompletedAt = getTiming(timings, AppInitTimingsStep.NOTIFICATION_PROCESSING_COMPLETED);
  if (notificationProcessingStartedAt.isJust && notificationProcessingCompletedAt.isJust) {
    startupTimings.notification_processing_duration_ms = Math.max(
      0,
      notificationProcessingCompletedAt.value - notificationProcessingStartedAt.value,
    );
  }

  const appUsableAt = getTiming(timings, AppInitTimingsStep.APP_LOADED);
  if (appUsableAt.isJust) {
    startupTimings.total_startup_duration_ms = appUsableAt.value;
  }

  return startupTimings;
}

function createStartupStatistics(
  result: ApplicationStartupReport['result'],
  statistics: AppStatistics,
  lastStep: Maybe<AppInitTimingsStep>,
): ApplicationStartupReport['statistics'] {
  const startupStatistics: Record<string, number | string> = {
    result,
  };

  const statisticMappings: ReadonlyArray<readonly [string, AppInitStatisticsValue]> = [
    ['notification_count', AppInitStatisticsValue.NOTIFICATIONS],
    ['connection_count_bucket', AppInitStatisticsValue.CONNECTIONS],
    ['conversation_count_bucket', AppInitStatisticsValue.CONVERSATIONS],
    ['client_count_bucket', AppInitStatisticsValue.CLIENTS],
    ['client_type', AppInitStatisticsValue.CLIENT_TYPE],
  ];

  statisticMappings.forEach(([reportStatisticName, statisticName]) => {
    const statistic = statistics[statisticName];
    if (is.string(statistic) || (is.number(statistic) && Number.isFinite(statistic))) {
      startupStatistics[reportStatisticName] = statistic;
    }
  });

  if (lastStep.isJust) {
    startupStatistics.last_step = lastStep.value;
  }

  return startupStatistics;
}

export function createApplicationStartupReport(
  options: CreateApplicationStartupReportOptions,
): ApplicationStartupReport {
  const {result, timings, statistics, lastStep} = options;

  return {
    result,
    ...(lastStep.isJust ? {lastStep: lastStep.value} : {}),
    timings: createStartupTimings(timings),
    statistics: createStartupStatistics(result, statistics, lastStep),
  };
}
