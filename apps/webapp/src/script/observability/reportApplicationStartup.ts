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

import type {Maybe} from 'true-myth';

import type {ApplicationObservability} from './applicationObservability';
import type {ApplicationStartupReport} from './applicationStartupReport';
import {createApplicationStartupReport} from './createApplicationStartupReport';

import type {AppStatistics} from '../telemetry/app_init/AppInitStatistics';
import type {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';

type ApplicationStartupLogger = {
  readonly warn: (message: string, context: {readonly error: unknown}) => void;
};

type ReportApplicationStartupOptions = {
  readonly result: ApplicationStartupReport['result'];
  readonly timings: Partial<Record<AppInitTimingsStep, number>>;
  readonly statistics: AppStatistics;
  readonly lastStep: Maybe<AppInitTimingsStep>;
};

type ReportApplicationStartupDependencies = {
  readonly applicationObservability: ApplicationObservability;
  readonly logger: ApplicationStartupLogger;
};

export async function reportApplicationStartup(
  options: ReportApplicationStartupOptions,
  dependencies: ReportApplicationStartupDependencies,
): Promise<void> {
  const {applicationObservability, logger} = dependencies;

  try {
    await applicationObservability.reportApplicationStartup(createApplicationStartupReport(options));
  } catch (error: unknown) {
    logger.warn('Failed to report application startup', {error});
  }
}
