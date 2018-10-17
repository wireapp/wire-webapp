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

z.location.LocationService = (() => {
  const GOOGLE_GEOCODE_PROXY_BASE_URL = '/proxy/googlemaps/maps/api/geocode/json';

  const _parseResults = ([{address_components: addressComponents, formatted_address: formattedAddress, geometry}]) => {
    const locationResult = {
      address: formattedAddress,
      lat: geometry.location.lat,
      lng: geometry.location.lng,
    };

    addressComponents.forEach(({long_name: longName, short_name: shortName, types}) => {
      const name = longName || shortName;

      types.forEach(type => {
        locationResult[type] = name;
        const isCountry = type === 'country';
        if (isCountry) {
          locationResult.countryCode = shortName || '';
        }
      });
    });

    const {
      administrative_area_level_1: areaLevel1,
      administrative_area_level_2: areaLevel2,
      administrative_area_level_3: areaLevel3,
      locality,
      natural_feature: naturalFeature,
    } = locationResult;

    locationResult.place = locality || naturalFeature || areaLevel3 || areaLevel2 || areaLevel1;

    delete locationResult.political;
    return z.util.ObjectUtil.escapeProperties(locationResult);
  };

  return class LocationService {
    constructor(backendClient) {
      this.backendClient = backendClient;
    }

    /**
     * Reverse loop up for geo location
     * @param {number} latitude - Latitude of location
     * @param {number} longitude - Longitude of location
     * @returns {Promise} Resolves with the location information
     */
    getLocation(latitude, longitude) {
      return new Promise((resolve, reject) => {
        if (latitude == null || longitude == null) {
          reject(new Error('You need to specify latitude and longitude in order to retrieve the location'));
        }

        const requestConfig = {
          data: {
            latlng: `${latitude},${longitude}`,
          },
          type: 'GET',
          url: this.backendClient.createUrl(GOOGLE_GEOCODE_PROXY_BASE_URL),
        };

        return this.backendClient
          .sendRequest(requestConfig)
          .then(response => {
            const isStatusOk = response.status === 'OK';
            return isStatusOk ? resolve(_parseResults(response.results)) : resolve();
          })
          .catch((jqXHR, textStatus, errorThrown) => reject(new Error(errorThrown)));
      });
    }

    /**
     * Return link to Google Maps
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
})();
