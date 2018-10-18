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

'use strict';

window.z = window.z || {};
window.z.integration = z.integration || {};

z.integration.IntegrationService = class IntegrationService {
  static get URL() {
    return {
      PROVIDERS: '/providers',
      SERVICES: '/services',
    };
  }

  /**
   * Construct a new Integration Service.
   * @class z.integration.IntegrationService
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.integration.IntegrationService', z.config.LOGGER.OPTIONS);
  }

  getProvider(providerId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}`,
    });
  }

  getProviderServices(providerId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}${IntegrationService.URL.SERVICES}`,
    });
  }

  getService(providerId, serviceId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${IntegrationService.URL.PROVIDERS}/${providerId}${IntegrationService.URL.SERVICES}/${serviceId}`,
    });
  }

  getServices(tags, start) {
    const params = {tags};
    if (start) {
      params.start = start;
    }

    return this.backendClient.sendRequest({
      data: params,
      type: 'GET',
      url: IntegrationService.URL.SERVICES,
    });
  }
};
