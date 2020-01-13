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

import {Logger, getLogger} from 'Util/Logger';

import {BackendClient} from '../service/BackendClient';

export class IntegrationService {
  static URL = {
    PROVIDERS: '/providers',
    SERVICES: '/services',
  };
  backendClient: BackendClient;
  logger: Logger;

  /**
   * Construct a new Integration Service.
   * @param backendClient Client for the API calls
   */
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
    this.logger = getLogger('IntegrationService');
  }

  getProvider(providerId: string): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}`,
    });
  }

  getProviderServices(providerId: string): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}${IntegrationService.URL.SERVICES}`,
    });
  }

  getService(providerId: string, serviceId: string): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}${IntegrationService.URL.SERVICES}/${serviceId}`,
    });
  }

  getServices(tags: string[] | string, start: string): Promise<any> {
    const params: Record<string, string[] | string> = {tags};
    if (start) {
      params.start = start;
    }

    return this.backendClient.sendRequest({
      data: params,
      type: 'GET',
      url: IntegrationService.URL.SERVICES,
    });
  }
}
