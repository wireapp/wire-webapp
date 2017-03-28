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

// grunt test_init && grunt test_run:location/GeoLocation

'use strict';

describe('z.location', () => describe('get_maps_url', () => {
  it('should return proper url when lat and long is given', () => {
    expect(z.location.get_maps_url(52, 13)).toBe('https://google.com/maps/@52,13')
  });

  it('should return proper url when lat, long and zoom is given', () => {
    expect(z.location.get_maps_url(52, 13, null, 14)).toBe('https://google.com/maps/@52,13,14z')
  });

  it('should return proper url when lat, long and name is given', () => {
    expect(z.location.get_maps_url(52, 13, 'Berlin')).toBe('https://google.com/maps/place/Berlin/@52,13')
  });

  it('should return proper url when lat, long, name and zoom is given', () => {
    expect(z.location.get_maps_url(52, 13, 'Berlin', 14)).toBe('https://google.com/maps/place/Berlin/@52,13,14z')
  });
}));
