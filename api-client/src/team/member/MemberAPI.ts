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
import {ArrayUtil} from '@wireapp/commons';

export class MemberAPI {
  public static readonly DEFAULT_USERS_CHUNK_SIZE = 50;
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    MEMBERS: 'members',
  };

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

  /**
   * This endpoint returns all members of the a team unless it's a large team (>2000 team member).
   * If the queried team is a large team the `hasMore` flag will switch to `true`.
   */
  public async getAllMembers(teamId: string): Promise<Members> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
    };

    const response = await this.client.sendJSON<Members>(config);
    return response.data;
  }

  public async getMembers(
    teamId: string,
    parameters: {ids: string[]},
    limit = MemberAPI.DEFAULT_USERS_CHUNK_SIZE,
  ): Promise<MemberData[]> {
    const {ids} = parameters;

    if (ids.length) {
      const uniqueIds = ArrayUtil.removeDuplicates(ids);
      const idChunks = ArrayUtil.chunk(uniqueIds, limit);
      const resolvedTasks = await Promise.all(
        idChunks.map(async idChunk => {
          const result = await this._getMembers(teamId, {ids: idChunk});
          return result.members;
        }),
      );
      return ArrayUtil.flatten(resolvedTasks);
    }

    return [];
  }

  private async _getMembers(teamId: string, parameters: {ids: string[]}): Promise<Members> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {ids: parameters.ids.join(',')},
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
    };

    const response = await this.client.sendJSON<Members>(config);
    return response.data;
  }
}
