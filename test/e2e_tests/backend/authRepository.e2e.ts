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

import {User as AuthUser} from '@wireapp/api-client/lib/user';
import {AxiosResponse} from 'axios';

import {BackendClientE2E} from './backendClient.e2e';

import {User} from '../data/user';

export class AuthRepositoryE2E extends BackendClientE2E {
  public async registerUser(user: User, invitationCode?: string): Promise<AxiosResponse> {
    const response = await this.axiosInstance.post('register', {
      password: user.password,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      ...(invitationCode && {team_code: invitationCode}),
    });

    if (!response.data.id) {
      throw new Error('User registration failed, no user ID returned');
    }

    user.id = response.data.id;
    user.qualifiedId = {
      domain: response.data?.domain ?? '',
      id: response.data.id,
    };
    return response;
  }

  public async registerTeamOwner(
    user: User,
    teamName: string,
    activationCode: string,
  ): Promise<AxiosResponse<AuthUser>> {
    return this.axiosInstance.post('register', {
      password: user.password,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      email_code: activationCode,
      team: {
        name: teamName,
        icon: 'default',
        binding: true,
      },
    });
  }

  async upgradeUserToTeamOwner(user: User, teamName: string) {
    const res = this.axiosInstance.post(
      'upgrade-personal-to-team',
      {
        name: teamName,
        icon: 'default',
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      },
    );
    const data = (await res).data;
    return {teamId: data.team_id, teamName: data.team_name};
  }

  public async activateAccount(email: string, code: string) {
    await this.axiosInstance.post('activate', {
      code,
      dryrun: false,
      email: email,
    });
  }

  public async bookEmail(email: string) {
    await this.axiosInstance.post('activate/send', {
      email: email,
    });
  }

  public async loginUser(user: User): Promise<AxiosResponse> {
    const response = await this.axiosInstance.post(
      'login',
      {
        email: user.email,
        password: user.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    user.token = response.data.access_token;

    if (!response.data.id) {
      throw new Error('User registration failed, no user ID returned');
    }

    user.id = response.data.user;
    user.qualifiedId = {
      domain: response.data?.domain ?? '',
      id: response.data.id,
    };
    return response;
  }

  public async requestAccessToken(zuidCookie: string): Promise<string> {
    const accessResponse = await this.axiosInstance.post(
      'access',
      {
        withCredentials: true,
      },
      {
        headers: {
          Cookie: zuidCookie,
        },
      },
    );

    return accessResponse.data.access_token;
  }
}
