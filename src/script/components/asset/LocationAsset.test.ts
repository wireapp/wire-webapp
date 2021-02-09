/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import TestPage from 'Util/test/TestPage';

import LocationAsset, {LocationAssetProps} from './LocationAsset';

import type {Location} from 'src/script/entity/message/Location';

class LocationAssetPage extends TestPage<LocationAssetProps> {
  constructor(props?: LocationAssetProps) {
    super(LocationAsset, props);
  }

  getMapsLink = () => this.get('[data-uie-name="location-asset-link"]');
  getLocationName = () => this.get('[data-uie-name="location-name"]');
}

describe('LocationAsset', () => {
  const location: Partial<Location> = {latitude: '52.31', longitude: '13.24', name: 'Berlin', zoom: '0'};

  it('sets the correct Google Maps link', () => {
    const assetLoader = new LocationAssetPage({asset: location as Location});
    const mapsLink = assetLoader.getMapsLink();

    expect(mapsLink.getDOMNode<HTMLLinkElement>().href).toContain(`${location.latitude},${location.longitude}`);
  });

  it('sets the correct location name', () => {
    const assetLoader = new LocationAssetPage({asset: location as Location});
    const locationName = assetLoader.getLocationName();

    expect(locationName.text()).toBe(location.name);
  });
});
