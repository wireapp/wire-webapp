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

import {AxiosRequestConfig} from 'axios';

import {HttpClient} from '../../http/';
import {MemberData, Members} from '../member/';
import {TeamAPI} from '../team/TeamAPI';

export class MemberAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    MEMBERS: 'members',
  };

  public async getMembers(teamId: string): Promise<Members> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
    };

    const response = await this.client.sendJSON<Members>(config);
    return response.data;
  }

  public async getMember(teamId: string, userId: string): Promise<MemberData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}/${userId}`,
    };

    const response = await this.client.sendJSON<MemberData>(config);
    return response.data;
  }

  public async deleteMember(teamId: string, userId: string, password: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}/${userId}`,
    };

    await this.client.sendJSON(config);
  }

  public async postMembers(teamId: string, member: MemberData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        member: member,
      },
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
    };

    await this.client.sendJSON(config);
  }

  public async putMembers(teamId: string, member: MemberData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        member: member,
      },
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
    };

    await this.client.sendJSON(config);
  }
}
