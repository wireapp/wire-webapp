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

import type {Provider, Service} from '@wireapp/api-client/src/team/service';
import {container} from 'tsyringe';

import {APIClient} from '../service/APIClientSingleton';

export class IntegrationService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  getProvider(providerId: string): Promise<Provider> {
    return this.apiClient.teams.service.api.getProvider(providerId);
  }

  async getProviderServices(providerId: string): Promise<Service[]> {
    const servicesChunk = await this.apiClient.teams.service.api.getProviderServices(providerId);
    return servicesChunk.services;
  }

  getService(providerId: string, serviceId: string): Promise<Service> {
    return this.apiClient.teams.service.api.getService(providerId, serviceId);
  }

  getServices(tags: string[] | string, start: string): Promise<any> {
    return this.apiClient.teams.service.api.getServices(undefined, start, tags);
  }
}
