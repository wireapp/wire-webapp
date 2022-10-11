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

import {createRandomUuid} from 'Util/util';

import {ServiceEntity} from '../integration/ServiceEntity';
import ServiceList from './ServiceList';
import {render} from '@testing-library/react';

describe('ServiceList', () => {
  it('lists the services', () => {
    const serviceEntity1 = new ServiceEntity({id: createRandomUuid()});
    const serviceEntity2 = new ServiceEntity({id: createRandomUuid()});

    const props = {
      arrow: false,
      click: () => {},
      isSearching: false,
      noUnderline: true,
      services: [serviceEntity1, serviceEntity2],
    };

    const {getByTestId} = render(<ServiceList {...props} />);

    expect(expect(getByTestId(`service-list-service-${serviceEntity1.id}`))).not.toBeNull();
    expect(expect(getByTestId(`service-list-service-${serviceEntity2.id}`))).not.toBeNull();
  });

  it('shows the "no results found" element when there are no services', () => {
    const props = {
      arrow: false,
      click: () => {},
      isSearching: true,
      noUnderline: true,
      services: [] as ServiceEntity[],
    };

    const {getByTestId} = render(<ServiceList {...props} />);

    expect(getByTestId('service-list-no-results')).not.toBeNull();
  });
});
