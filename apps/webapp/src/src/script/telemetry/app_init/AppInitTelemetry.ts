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

import {AppInitStatistics, AppStatistics} from './AppInitStatistics';
import type {AppInitStatisticsValue} from './AppInitStatisticsValue';
import {AppInitTimings} from './AppInitTimings';
import type {AppInitTimingsStep} from './AppInitTimingsStep';

export class AppInitTelemetry {
  private readonly timings: AppInitTimings;
  private readonly statistics: AppInitStatistics;

  constructor() {
    this.timings = new AppInitTimings();
    this.statistics = new AppInitStatistics();
  }

  addStatistic(statistic: AppInitStatisticsValue, value: string | number, bucket_size?: number): void {
    this.statistics.add(statistic, value, bucket_size);
  }

  getStatistics(): AppStatistics {
    return this.statistics.get();
  }

  logStatistics(): void {
    this.statistics.log();
  }

  logTimings(): void {
    this.timings.log();
  }

  report(): number {
    this.logStatistics();
    this.logTimings();

    return this.timings.getAppLoad();
  }

  timeStep(step: AppInitTimingsStep): void {
    return this.timings.timeStep(step);
  }
}
