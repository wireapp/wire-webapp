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

import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

export class PropertiesService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  /**
   * Clear all properties store for the user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
   * @returns Resolves when all properties for user have been cleared
   */
  deleteProperties(): Promise<void> {
    return this.apiClient.api.user.deleteProperties();
  }

  deletePropertiesByKey(key: string): Promise<void> {
    return this.apiClient.api.user.deleteProperty(key);
  }

  getProperties(): Promise<string[]> {
    return this.apiClient.api.user.getProperties();
  }

  getPropertiesByKey<T = any>(key: string): Promise<T> {
    return this.apiClient.api.user.getProperty<T>(key);
  }

  putPropertiesByKey<T extends Record<string, any>>(key: string, properties: T): Promise<void> {
    return this.apiClient.api.user.putProperty<T>(key, properties);
  }
}
