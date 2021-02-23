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
import {createRandomUuid} from 'Util/util';

import {ServiceEntity} from '../integration/ServiceEntity';
import ServiceList, {ServiceListProps} from './ServiceList';

class ServiceListPage extends TestPage<ServiceListProps> {
  constructor(props?: ServiceListProps) {
    super(ServiceList, props);
  }

  getNoResultsElement = () => this.get('[data-uie-name="service-list-no-results"]');
  getServiceElement = (serviceId: string) => this.get(`[data-uie-name="service-list-service-${serviceId}"]`);
}

describe('ServiceList', () => {
  it('lists the services', () => {
    const serviceEntity1 = new ServiceEntity({id: createRandomUuid()});
    const serviceEntity2 = new ServiceEntity({id: createRandomUuid()});

    const serviceList = new ServiceListPage({
      arrow: false,
      click: () => {},
      isSearching: false,
      noUnderline: true,
      services: [serviceEntity1, serviceEntity2],
    });

    const serviceElement1 = serviceList.getServiceElement(serviceEntity1.id);
    const serviceElement2 = serviceList.getServiceElement(serviceEntity2.id);

    expect(serviceElement1.exists()).toBe(true);
    expect(serviceElement2.exists()).toBe(true);
  });

  it('shows the "no results found" element when there are no services', () => {
    const serviceList = new ServiceListPage({
      arrow: false,
      click: () => {},
      isSearching: true,
      noUnderline: true,
      services: [],
    });

    const noResultsElement = serviceList.getNoResultsElement();

    expect(noResultsElement.exists()).toBe(true);
  });
});
