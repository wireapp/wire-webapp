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

z.telemetry.app_init.AppInitTimings = class AppInitTimings {
  static get CONFIG() {
    return {
      BUCKET_SIZE: 10,
      LOG_LENGTH_KEY: 27,
      LOG_LENGTH_VALUE: 6,
    };
  }

  constructor() {
    this.logger = new z.util.Logger(
      'z.telemetry.AppInitTimings',
      z.config.LOGGER.OPTIONS
    );
    this.init = window.performance.now();
  }

  get() {
    const timings = {};

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key];

        if (key.toString() !== 'init' && _.isNumber(value)) {
          timings[key] = value;
        }
      }
    }

    return timings;
  }

  get_app_load() {
    const app_loaded_in_seconds =
      this[z.telemetry.app_init.AppInitTimingsStep.APP_LOADED] / 1000;
    return (
      (Math.floor(app_loaded_in_seconds / AppInitTimings.CONFIG.BUCKET_SIZE) +
        1) *
      AppInitTimings.CONFIG.BUCKET_SIZE
    );
  }

  log() {
    this.logger.debug('App initialization step durations');

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key];

        if (key.toString() !== 'init' && _.isNumber(value)) {
          const placeholder_key_length = Math.max(
            AppInitTimings.CONFIG.LOG_LENGTH_KEY - key.length,
            1
          );
          const placeholder_key = new Array(placeholder_key_length).join(' ');
          const placeholder_value_length = Math.max(
            AppInitTimings.CONFIG.LOG_LENGTH_VALUE - value.toString().length,
            1
          );
          const placeholder_value = new Array(placeholder_value_length).join(
            ' '
          );

          this.logger.info(
            `${placeholder_key}'${key}':${placeholder_value}${value}ms`
          );
        }
      }
    }
  }

  time_step(step) {
    if (!this[step]) {
      return (this[step] = window.parseInt(
        window.performance.now() - this.init
      ));
    }
  }
};
