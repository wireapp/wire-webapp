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
window.z.lifecycle = z.lifecycle || {};

z.lifecycle.LifecycleService = class LifecycleService {
  static get CONFIG() {
    return {
      URL: {
        VERSION: '/version/',
      },
    };
  }

  constructor() {
    this.logger = new z.util.Logger('z.lifecycle.LifecycleService', z.config.LOGGER.OPTIONS);
  }

  getVersion() {
    return this._fetchData(LifecycleService.CONFIG.URL.VERSION).then(({version}) => version);
  }

  _fetchData(url) {
    return fetch(url).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Failed to fetch '${url}': ${response.statusText}`);
    });
  }
};
