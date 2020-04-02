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

import {getLogger, Logger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {AppInitTimingsStep} from './AppInitTimingsStep';

export class AppInitTimings {
  private readonly timings: Record<AppInitTimingsStep, number>;
  private readonly init: number;
  private readonly logger: Logger;

  static get CONFIG() {
    return {
      BUCKET_SIZE: 10,
      LOG_LENGTH_KEY: 27,
      LOG_LENGTH_VALUE: 6,
    };
  }

  constructor() {
    this.logger = getLogger('AppInitTimings');
    this.init = window.performance.now();
  }

  get(): Record<AppInitTimingsStep, number> {
    return {...this.timings};
  }

  get_app_load(): number {
    const appLoaded = this.timings[AppInitTimingsStep.APP_LOADED];
    const appLoadedInSeconds = appLoaded / TIME_IN_MILLIS.SECOND;

    return (Math.floor(appLoadedInSeconds / AppInitTimings.CONFIG.BUCKET_SIZE) + 1) * AppInitTimings.CONFIG.BUCKET_SIZE;
  }

  log() {
    this.logger.debug('App initialization step durations', this.timings);
  }

  time_step(step: AppInitTimingsStep): void {
    if (!this.timings[step]) {
      this.timings[step] = window.performance.now() - this.init;
    }
  }
}
