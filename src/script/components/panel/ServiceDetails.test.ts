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

import {ServiceEntity} from '../../integration/ServiceEntity';
import ServiceDetails, {ServiceDetailsProps} from './ServiceDetails';

class ServiceDetailsPage extends TestPage<ServiceDetailsProps> {
  constructor(props: ServiceDetailsProps) {
    super(ServiceDetails, props);
  }

  getName = () => this.get('[data-uie-name="status-service-name"]');
  getProvider = () => this.get('[data-uie-name="status-service-provider"]');
  getDescription = () => this.get('[data-uie-name="status-service-description"]');
}

describe('ServiceDetails', () => {
  it('renders the correct infos for the service', () => {
    const serviceName = 'serviceName';
    const serviceProvider = 'serviceProvider';
    const serviceDescription = 'serviceDescription';
    const service = new ServiceEntity({description: serviceDescription, name: serviceName});
    service.providerName(serviceProvider);
    const serviceDetails = new ServiceDetailsPage({service});

    expect(serviceDetails.getName().text()).toBe(serviceName);
    expect(serviceDetails.getProvider().text()).toBe(serviceProvider);
    expect(serviceDetails.getDescription().text()).toBe(serviceDescription);
  });
});
