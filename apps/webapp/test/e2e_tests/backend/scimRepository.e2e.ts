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

import {BackendClientE2E} from './backendClient.e2e';
import {User} from '../data/user';

export class ScimRepositoryE2E extends BackendClientE2E {
  async createSCIMAccessToken(user: User, identityProviderId: string) {
    const response = await this.axiosInstance.post(
      'scim/auth-tokens',
      {
        description: 'SCIM',
        idp: identityProviderId,
        name: user.fullName,
        password: user.password,
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.token;
  }

  async createSCIMUser(user: User, scimToken: string) {
    const scimUsername = user.email.replace(/[^A-Za-z0-9]/g, '').substring(0, 21);

    const response = await this.axiosInstance.post(
      'scim/v2/Users',
      {
        externalId: user.email,
        userName: scimUsername,
        displayName: user.fullName,
      },
      {
        headers: {
          Authorization: `Bearer ${scimToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/scim+json',
        },
      },
    );

    return response.data.id;
  }
}
