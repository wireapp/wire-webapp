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

import {Maybe} from 'true-myth';

import {AppInitStatistics, AppStatistics} from './AppInitStatistics';
import type {AppInitStatisticsValue} from './AppInitStatisticsValue';
import {AppInitTimings} from './AppInitTimings';
import type {AppInitTimingsStep} from './AppInitTimingsStep';

import type {MonotonicClock} from '../../time/monotonicClock';

export class AppInitTelemetry {
  private readonly appInitTimings: AppInitTimings;
  private readonly appInitStatistics: AppInitStatistics;

  constructor(monotonicClock: MonotonicClock, startedAtMilliseconds: number) {
    this.appInitTimings = new AppInitTimings(monotonicClock, startedAtMilliseconds);
    this.appInitStatistics = new AppInitStatistics();
  }

  addStatistic(statistic: AppInitStatisticsValue, value: string | number, bucket_size?: number): void {
    this.appInitStatistics.add(statistic, value, bucket_size);
  }

  getStatistics(): AppStatistics {
    return this.appInitStatistics.get();
  }

  get timings(): Partial<Record<AppInitTimingsStep, number>> {
    return this.appInitTimings.get();
  }

  get lastStep(): Maybe<AppInitTimingsStep> {
    return this.appInitTimings.lastStep;
  }

  logStatistics(): void {
    this.appInitStatistics.log();
  }

  logTimings(): void {
    this.appInitTimings.log();
  }

  report(): number {
    this.logStatistics();
    this.logTimings();

    return this.appInitTimings.getAppLoad();
  }

  timeStep(step: AppInitTimingsStep): void {
    return this.appInitTimings.timeStep(step);
  }

  timeStepAt(step: AppInitTimingsStep, occurredAtMilliseconds: number): void {
    return this.appInitTimings.timeStepAt(step, occurredAtMilliseconds);
  }
}
