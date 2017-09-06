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
window.z.announce = z.announce || {};

z.announce.AnnounceService = class AnnounceService {
  static get CONFIG() {
    return {
      URL: {
        ANNOUNCE: 'api/v1/announce/',
        VERSION: 'version/',
      },
    };
  }

  constructor() {
    this.logger = new z.util.Logger('z.announce.AnnounceService', z.config.LOGGER.OPTIONS);
    this.announce_url = `${z.util.Environment.backend.website_url()}${AnnounceService.CONFIG.URL.ANNOUNCE}?order=created&active=true`;
    if (z.util.Environment.frontend.is_production()) {
      this.announce_url += '&production=true';
    }
  }

  get_announcements() {
    return this._fetch_data(this.announce_url)
      .then(({result}) => result);
  }

  get_version() {
    return this._fetch_data(AnnounceService.CONFIG.URL.VERSION)
      .then(({version}) => version);
  }

  _fetch_data(url) {
    return fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(`Failed to fetch '${url}': ${response.statusText}`);
      });
  }
};
