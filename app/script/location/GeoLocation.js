/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

z.location = (() => {
  const GOOGLE_GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
  const API_KEY = 'AIzaSyCKxxKw5JBZ5zEFtoirtgnw8omvH7gWzfo';
  let _parse_results = (results) => {
    let res = {};
    let [result] = results;
    res['address'] = result.formatted_address;
    res['lat'] = result.geometry.location.lat;
    res['lng'] = result.geometry.location.lng;
    for (let component of result.address_components) {
      let name = component.long_name || component.short_name;
      for (let type of component.types) {
        res[type] = name;
        if (type === 'country') {
          res['country_code'] = component.short_name || '';
        }
      }
    }
    res['place'] = res.locality || res.natural_feature || res.administrative_area_level_3 || res.administrative_area_level_2 || res.administrative_area_level_1;
    delete (res.political != null);
    return res;
  };

  /*
  Reverse loop up for geo location
  @param latitude [Number] latitude
  @param longitude [Number] longitude
   */
  let get_location = (latitude, longitude) => {
    return new Promise((resolve, reject) => {
      if ((latitude == null) || (longitude == null)) {
        reject(new Error('You need to specify latitude and longitude in order to retrieve the location'));
      }
      $.ajax({
        url: `${GOOGLE_GEOCODING_BASE_URL}?latlng=${latitude},${longitude}&key=${API_KEY}`,
      })
      .done(response => {
        if (response.status === 'OK') {
          return resolve(_parse_results(response.results));
        }
        return resolve();
      })
      .fail((jqXHR, textStatus, errorThrown) => reject(new Error(errorThrown)));
    });
  };

  /*
  Return link to google maps

  @param lat [Number] latitude
  @param lng [Number] longitude
  @param name [String] location name
  @param zoom [String] map zoom level
   */
  let get_maps_url = (lat, lng, name, zoom) => {
    let base_url;
    base_url = 'https://google.com/maps/';
    if (name != null) {
      base_url += `place/${name}/`;
    }
    base_url += `@${lat},${lng}`;
    if (zoom != null) {
      base_url += `,${zoom}z`;
    }
    return base_url;
  };
  return {
    get_location,
    get_maps_url,
  };
})();
