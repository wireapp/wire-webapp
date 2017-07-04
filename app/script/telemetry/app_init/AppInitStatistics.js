/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.telemetry = z.telemetry || {};
window.z.telemetry.app_init = z.telemetry.app_init || {};

z.telemetry.app_init.AppInitStatistics = class AppInitStatistics {
  static get CONFIG() {
    return {
      LOG_LENGTH_KEY: 17,
      LOG_LENGTH_VALUE: 11,
    };
  }

  constructor() {
    this.logger = new z.util.Logger('z.telemetry.app_init.AppInitStatistics', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.TELEMETRY.BACKEND_REQUESTS, this.update_backend_requests.bind(this));
  }

  add(statistic, value, bucket_size) {
    if (bucket_size && _.isNumber(value)) {
      const buckets = Math.floor(value / bucket_size) + (value % bucket_size ? 1 : 0);

      return (this[statistic] = value === 0 ? 0 : bucket_size * buckets);
    }

    return (this[statistic] = value);
  }

  get() {
    const statistics = {};

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key];

        if (_.isNumber(value) || _.isString(value)) {
          statistics[key] = value;
        }
      }
    }

    return statistics;
  }

  log() {
    this.logger.debug('App initialization statistics');

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key];
        if (_.isNumber(value) || _.isString(value)) {
          const placeholder_key_length = Math.max(AppInitStatistics.CONFIG.LOG_LENGTH_KEY - key.length, 1);
          const placeholder_key = new Array(placeholder_key_length).join(' ');
          const placeholder_value_length = Math.max(
            AppInitStatistics.CONFIG.LOG_LENGTH_VALUE - value.toString().length,
            1
          );
          const placeholder_value = new Array(placeholder_value_length).join(' ');

          this.logger.info(`${placeholder_key}'${key}':${placeholder_value}${value}`);
        }
      }
    }
  }

  update_backend_requests(number_of_requests) {
    this[z.telemetry.app_init.AppInitStatisticsValue.BACKEND_REQUESTS] = number_of_requests;
  }
};
