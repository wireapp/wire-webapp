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

import {AxiosResponse} from 'axios';

import {BackendClient} from './backendClient';
import {User} from './user';

export class AuthRepository extends BackendClient {
  public async registerUser(user: User, invitationCode?: string): Promise<AxiosResponse> {
    const response = await this.axiosInstance.post('register', {
      password: user.password,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      ...(invitationCode && {team_code: invitationCode}),
    });
    user.id = response.data.id;
    return response;
  }

  public async registerTeamOwner(user: User, teamName: string, activationCode: string): Promise<AxiosResponse> {
    const response = await this.axiosInstance.post('register', {
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
    user.id = response.data.id;
    user.teamId = response.data.team;
    return response;
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
