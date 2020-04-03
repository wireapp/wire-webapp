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

import {AppInitStatisticsValue} from './AppInitStatisticsValue';
import {WebAppEvents} from '../../event/WebApp';

type Statistics = Partial<Record<AppInitStatisticsValue, string | number>>;

export class AppInitStatistics {
  private readonly logger: Logger;
  private readonly statistics: Statistics;

  static get CONFIG() {
    return {
      LOG_LENGTH_KEY: 17,
      LOG_LENGTH_VALUE: 11,
    };
  }

  constructor() {
    this.logger = getLogger('AppInitStatistics');
    this.statistics = {};
    amplify.subscribe(WebAppEvents.TELEMETRY.BACKEND_REQUESTS, this.update_backend_requests.bind(this));
  }

  add(statistic: AppInitStatisticsValue, value: string | number, bucket_size?: number): void {
    if (bucket_size && typeof value === 'number') {
      const buckets = Math.floor(value / bucket_size) + (value % bucket_size ? 1 : 0);

      this.statistics[statistic] = value === 0 ? 0 : bucket_size * buckets;
    } else {
      this.statistics[statistic] = value;
    }
  }

  get(): Statistics {
    return {...this.statistics};
  }

  log(): void {
    this.logger.debug('App initialization statistics', this.statistics);
  }

  update_backend_requests(number_of_requests: number): void {
    this.statistics[AppInitStatisticsValue.BACKEND_REQUESTS] = number_of_requests;
  }
}
