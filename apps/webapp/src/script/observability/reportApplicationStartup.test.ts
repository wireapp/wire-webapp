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

import type {ApplicationStartupReport} from './applicationStartupReport';
import {reportApplicationStartup} from './reportApplicationStartup';

import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';

describe('reportApplicationStartup', () => {
  it('reports a failure startup result', async () => {
    const reportedApplicationStartupReports: ApplicationStartupReport[] = [];
    const applicationObservability = {
      async reportApplicationStartup(report: ApplicationStartupReport): Promise<void> {
        reportedApplicationStartupReports.push(report);
      },
    };
    const logger = {
      warn: jest.fn(),
    };

    await reportApplicationStartup(
      {
        result: 'failure',
        timings: {
          [AppInitTimingsStep.INIT_APP_STARTED]: 12,
        },
        statistics: {},
        lastStep: Maybe.just(AppInitTimingsStep.INIT_APP_STARTED),
      },
      {applicationObservability, logger},
    );

    expect(reportedApplicationStartupReports).toEqual([
      {
        result: 'failure',
        lastStep: AppInitTimingsStep.INIT_APP_STARTED,
        timings: {
          app_bootstrap_started_ms: 0,
          init_app_started_ms: 12,
        },
        statistics: {
          result: 'failure',
          last_step: AppInitTimingsStep.INIT_APP_STARTED,
        },
      },
    ]);
  });

  it('does not throw when observability reporting fails', async () => {
    const reportingError = new Error('reporting failed');
    const applicationObservability = {
      async reportApplicationStartup(): Promise<void> {
        throw reportingError;
      },
    };
    const logger = {
      warn: jest.fn(),
    };

    await expect(
      reportApplicationStartup(
        {
          result: 'failure',
          timings: {},
          statistics: {},
          lastStep: Maybe.nothing(),
        },
        {applicationObservability, logger},
      ),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith('Failed to report application startup', {error: reportingError});
  });
});
