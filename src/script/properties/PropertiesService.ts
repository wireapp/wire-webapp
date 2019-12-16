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

import {BackendClient} from '../service/BackendClient';

class PropertiesService {
  private readonly backendClient: BackendClient;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      URL_PROPERTIES: '/properties',
    };
  }

  /**
   * Construct a new Properties Service.
   * @param {BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Clear all properties store for the user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
   * @returns {Promise} Resolves when all properties for user have been cleared
   */
  deleteProperties(): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: PropertiesService.CONFIG.URL_PROPERTIES,
    });
  }

  deletePropertiesByKey(key: string): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`,
    });
  }

  getProperties(): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: PropertiesService.CONFIG.URL_PROPERTIES,
    });
  }

  getPropertiesByKey(key: string): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`,
    });
  }

  putPropertiesByKey<T extends Record<string, any>>(key: keyof T, properties: T): Promise<void> {
    return this.backendClient.sendJson({
      data: properties,
      type: 'PUT',
      url: `${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`,
    });
  }
}

export {PropertiesService};
