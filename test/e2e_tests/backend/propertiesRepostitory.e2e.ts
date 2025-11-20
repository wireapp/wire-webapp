/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';

import {TypeUtil} from '@wireapp/commons';

import {BackendClientE2E} from './backendClient.e2e';

export class PropertiesRepositoryE2E extends BackendClientE2E {
  /** Update a property of a user, e.g. to decline sharing telemetry */
  async putProperty(data: TypeUtil.RecursivePartial<WebappProperties>, token: string) {
    await this.axiosInstance.put('properties/webapp', data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
