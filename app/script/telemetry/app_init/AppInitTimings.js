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
    this.logger = new z.util.Logger('z.telemetry.AppInitTimings', z.config.LOGGER.OPTIONS);
    this.init = window.performance.now();
  }

  get() {
    const timings = {};

    Object.entries(this).forEach(([key, value]) => {
      if (key.toString() !== 'init' && _.isNumber(value)) {
        timings[key] = value;
      }
    });

    return timings;
  }

  get_app_load() {
    const CONFIG = AppInitTimings.CONFIG;
    const appLoaded = this[z.telemetry.app_init.AppInitTimingsStep.APP_LOADED];
    const appLoadedInSeconds = appLoaded / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;

    return (Math.floor(appLoadedInSeconds / CONFIG.BUCKET_SIZE) + 1) * CONFIG.BUCKET_SIZE;
  }

  log() {
    this.logger.debug('App initialization step durations');

    Object.entries(this).forEach(([key, value]) => {
      if (key.toString() !== 'init' && _.isNumber(value)) {
        const placeholderKeyLength = Math.max(AppInitTimings.CONFIG.LOG_LENGTH_KEY - key.length, 1);
        const placeholderKey = new Array(placeholderKeyLength).join(' ');
        const placeholderValueLength = Math.max(AppInitTimings.CONFIG.LOG_LENGTH_VALUE - value.toString().length, 1);
        const placeholderValue = new Array(placeholderValueLength).join(' ');

        this.logger.info(`${placeholderKey}'${key}':${placeholderValue}${value}ms`);
      }
    });
  }

  time_step(step) {
    if (!this[step]) {
      return (this[step] = window.parseInt(window.performance.now() - this.init));
    }
  }
};
