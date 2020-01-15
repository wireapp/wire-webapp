/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

/**
 * Return link to Google Maps.
 *
 * @param latitude Latitude of location
 * @param longitude Longitude of location
 * @param name Name of location
 * @param zoom Map zoom level
 * @returns URL to location in Google Maps
 */
export function getMapsUrl(latitude: number, longitude: number, name: string, zoom: string): string {
  const baseUrl = 'https://google.com/maps/';

  const nameParam = name ? `place/${name}/` : '';
  const locationParam = `@${latitude},${longitude}`;
  const zoomParam = zoom ? `,${zoom}z` : '';

  return `${baseUrl}${nameParam}${locationParam}${zoomParam}`;
}
