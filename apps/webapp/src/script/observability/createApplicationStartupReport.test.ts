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

import {Maybe} from 'true-myth';

import {AppInitStatisticsValue} from '../telemetry/app_init/AppInitStatisticsValue';
import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';

import {createApplicationStartupReport} from './createApplicationStartupReport';

describe('createApplicationStartupReport', () => {
  it('creates a safe success report', () => {
    const actualReport = createApplicationStartupReport({
      result: 'success',
      lastStep: Maybe.just(AppInitTimingsStep.APP_LOADED),
      timings: {
        [AppInitTimingsStep.DOM_CONTENT_LOADED]: 10,
        [AppInitTimingsStep.INIT_APP_STARTED]: 20,
        [AppInitTimingsStep.NOTIFICATION_PROCESSING_STARTED]: 40,
        [AppInitTimingsStep.NOTIFICATION_PROCESSING_COMPLETED]: 75,
        [AppInitTimingsStep.APP_LOADED]: 100,
      },
      statistics: {
        [AppInitStatisticsValue.NOTIFICATIONS]: 7,
        [AppInitStatisticsValue.CONNECTIONS]: 50,
        [AppInitStatisticsValue.CONVERSATIONS]: 100,
        [AppInitStatisticsValue.CLIENTS]: 5,
        [AppInitStatisticsValue.CLIENT_TYPE]: 'permanent',
        [AppInitStatisticsValue.BACKEND_REQUESTS]: 42,
      },
    });

    expect(actualReport).toEqual({
      result: 'success',
      lastStep: AppInitTimingsStep.APP_LOADED,
      timings: {
        app_bootstrap_started_ms: 0,
        dom_content_loaded_ms: 10,
        init_app_started_ms: 20,
        notification_processing_started_ms: 40,
        notification_processing_completed_ms: 75,
        notification_processing_duration_ms: 35,
        app_usable_ms: 100,
        total_startup_duration_ms: 100,
      },
      statistics: {
        result: 'success',
        last_step: AppInitTimingsStep.APP_LOADED,
        notification_count: 7,
        connection_count_bucket: 50,
        conversation_count_bucket: 100,
        client_count_bucket: 5,
        client_type: 'permanent',
      },
    });
  });

  it('creates a best-effort failure report with the last completed step', () => {
    const actualReport = createApplicationStartupReport({
      result: 'failure',
      lastStep: Maybe.just(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN),
      timings: {
        [AppInitTimingsStep.DOM_CONTENT_LOADED]: 8,
        [AppInitTimingsStep.INIT_APP_STARTED]: 16,
        [AppInitTimingsStep.RECEIVED_ACCESS_TOKEN]: 24,
      },
      statistics: {},
    });

    expect(actualReport).toEqual({
      result: 'failure',
      lastStep: AppInitTimingsStep.RECEIVED_ACCESS_TOKEN,
      timings: {
        app_bootstrap_started_ms: 0,
        dom_content_loaded_ms: 8,
        init_app_started_ms: 16,
        received_access_token_ms: 24,
      },
      statistics: {
        result: 'failure',
        last_step: AppInitTimingsStep.RECEIVED_ACCESS_TOKEN,
      },
    });
  });

  it('omits the last completed step when no step was recorded', () => {
    const actualReport = createApplicationStartupReport({
      result: 'failure',
      lastStep: Maybe.nothing(),
      timings: {},
      statistics: {},
    });

    expect(actualReport).toEqual({
      result: 'failure',
      timings: {
        app_bootstrap_started_ms: 0,
      },
      statistics: {
        result: 'failure',
      },
    });
  });
});
