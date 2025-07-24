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

import {render} from '@testing-library/react';

import type {Location} from 'Repositories/entity/message/Location';

import {LocationAsset} from './LocationAsset';

describe('LocationAsset', () => {
  const location: Partial<Location> = {latitude: '52.31', longitude: '13.24', name: 'Berlin', zoom: '0'};

  it('sets the correct Google Maps link', () => {
    const {getByTestId} = render(<LocationAsset asset={location as Location} />);

    const mapsElement = getByTestId('location-asset-link');

    const mapsLink = mapsElement.getAttribute('href');
    expect(mapsLink).toContain(`${location.latitude},${location.longitude}`);
  });

  it('sets the correct location name', () => {
    const {queryByText} = render(<LocationAsset asset={location as Location} />);
    expect(queryByText(location.name!)).not.toBeNull();
  });
});
