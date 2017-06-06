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
      URL: 'api/v1/announce/',
    };
  }

  constructor() {
    this.logger = new z.util.Logger(
      'z.announce.AnnounceService',
      z.config.LOGGER.OPTIONS,
    );
    this.url = `${z.util.Environment.backend.website_url()}${AnnounceService
      .CONFIG.URL}?order=created&active=true`;
    if (z.util.Environment.frontend.is_production()) {
      this.url += '&production=true';
    }
  }

  get_announcements() {
    return new Promise((resolve, reject) => {
      $.get(this.url)
        .done(data => {
          resolve(data['result']);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          reject(new Error(errorThrown));
        });
    });
  }

  get_version() {
    return new Promise((resolve, reject) => {
      $.get('version/')
        .done(data => {
          resolve(data['version']);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          reject(new Error(errorThrown));
        });
    });
  }
};
