/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';

import {getLogger, Logger} from 'Util/Logger';
import {Environment} from 'Util/Environment';

import {AppInitStatistics, AppStatistics} from './AppInitStatistics';
import {AppInitTimings, AppTimings} from './AppInitTimings';
import {WebAppEvents} from '../../event/WebApp';
import {EventName} from '../../tracking/EventName';
import {AppInitStatisticsValue} from './AppInitStatisticsValue';
import {AppInitTimingsStep} from './AppInitTimingsStep';

export class AppInitTelemetry {
  private readonly logger: Logger;
  private readonly timings: AppInitTimings;
  private readonly statistics: AppInitStatistics;

  constructor() {
    this.logger = getLogger('AppInitTelemetry');
    this.timings = new AppInitTimings();
    this.statistics = new AppInitStatistics();
  }

  add_statistic(statistic: AppInitStatisticsValue, value: string | number, bucket_size: number): void {
    this.statistics.add(statistic, value, bucket_size);
  }

  get_statistics(): AppStatistics {
    return this.statistics.get();
  }

  get_timings(): AppTimings {
    return this.timings.get();
  }

  log_statistics(): void {
    this.statistics.log();
  }

  log_timings(): void {
    this.timings.log();
  }

  report(): void {
    const statistics = this.get_statistics();

    statistics.loading_time = this.timings.get_app_load();
    statistics.app_version = Environment.version(false);
    this.logger.info(`App version '${statistics.app_version}' initialized within ${statistics.loading_time}s`);
    this.log_statistics();
    this.log_timings();

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.TELEMETRY.APP_INITIALIZATION, statistics);
  }

  time_step(step: AppInitTimingsStep): void {
    return this.timings.time_step(step);
  }
}
