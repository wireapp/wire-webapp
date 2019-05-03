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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';

import {AppInitStatistics} from './AppInitStatistics';
import {AppInitTimings} from './AppInitTimings';
import {WebAppEvents} from '../../event/WebApp';
import {EventName} from '../../tracking/EventName';

export class AppInitTelemetry {
  constructor() {
    this.logger = getLogger('AppInitTelemetry');
    this.timings = new AppInitTimings();
    this.statistics = new AppInitStatistics();
  }

  add_statistic(statistic, value, bucket_size) {
    return this.statistics.add(statistic, value, bucket_size);
  }

  get_statistics() {
    return this.statistics.get();
  }

  get_timings() {
    return this.timings.get();
  }

  log_statistics() {
    return this.statistics.log();
  }

  log_timings() {
    return this.timings.log();
  }

  report() {
    const statistics = this.get_statistics();

    statistics.loading_time = this.timings.get_app_load();
    statistics.app_version = Environment.version(false);
    this.logger.info(`App version '${statistics.app_version}' initialized within ${statistics.loading_time}s`);
    this.log_statistics();
    this.log_timings();

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.TELEMETRY.APP_INITIALIZATION, statistics);
  }

  time_step(step) {
    return this.timings.time_step(step);
  }
}
