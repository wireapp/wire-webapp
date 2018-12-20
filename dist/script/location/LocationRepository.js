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

'use strict';

window.z = window.z || {};
window.z.location = window.z.location || {};

z.location.LocationRepository = class LocationRepository {
  constructor(locationService) {
    this.locationService = locationService;
  }

  getLocation(latitude, longitude) {
    return this.locationService.getLocation(latitude, longitude);
  }

  /**
   * Return link to Google Maps.
   *
   * @param {number} latitude - Latitude of location
   * @param {number} longitude - Longitude of location
   * @param {string} name - Name of location
   * @param {string} zoom - Map zoom level
   * @returns {string} URL to location in Google Maps
   */
  getMapsUrl(latitude, longitude, name, zoom) {
    const baseUrl = 'https://google.com/maps/';

    const nameParam = name ? `place/${name}/` : '';
    const locationParam = `@${latitude},${longitude}`;
    const zoomParam = zoom ? `,${zoom}z` : '';

    return `${baseUrl}${nameParam}${locationParam}${zoomParam}`;
  }
};
