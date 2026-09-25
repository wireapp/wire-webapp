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
import type {Clock} from '@enormora/clock/clock';

import {Logger, getLogger} from 'Util/logger';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {AppInitTimingsStep} from './AppInitTimingsStep';

type AppTimings = Partial<Record<AppInitTimingsStep, number>>;

export class AppInitTimings {
  private readonly timings: AppTimings;
  private readonly startedAtMonotonicMicroseconds: bigint;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private lastRecordedStep: Maybe<AppInitTimingsStep> = Maybe.nothing();

  static get CONFIG() {
    return {
      BUCKET_SIZE: 10,
      LOG_LENGTH_KEY: 27,
      LOG_LENGTH_VALUE: 6,
    };
  }

  constructor(clock: Clock, startedAtMonotonicMicroseconds: bigint) {
    this.logger = getLogger('AppInitTimings');
    this.startedAtMonotonicMicroseconds = startedAtMonotonicMicroseconds;
    this.clock = clock;
    this.timings = {};
  }

  get(): AppTimings {
    return {...this.timings};
  }

  get lastStep(): Maybe<AppInitTimingsStep> {
    return this.lastRecordedStep;
  }

  getAppLoad(): number {
    const appLoaded = this.timings[AppInitTimingsStep.APP_LOADED] ?? 0;
    const appLoadedInSeconds = appLoaded / TIME_IN_MILLIS.SECOND;

    return Math.floor(appLoadedInSeconds);
  }

  log() {
    this.logger.debug('App initialization step durations', this.timings);
  }

  timeStep(step: AppInitTimingsStep): void {
    this.timeStepAt(step, this.clock.currentMonotonicMicroseconds);
  }

  timeStepAt(step: AppInitTimingsStep, occurredAtMonotonicMicroseconds: bigint): void {
    if (this.timings[step] === undefined) {
      const durationInMonotonicMicroseconds = occurredAtMonotonicMicroseconds - this.startedAtMonotonicMicroseconds;
      this.timings[step] = Number(durationInMonotonicMicroseconds) / 1_000;
      this.lastRecordedStep = Maybe.just(step);
    }
  }
}
