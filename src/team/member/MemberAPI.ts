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

import axios, {AxiosRequestConfig} from 'axios';

import {ArrayUtil} from '@wireapp/commons';

import {MemberCSVResponse} from './MemberCSVResponse';
import {UpdatedMemberData} from './UpdatedMemberData';

import {
  BackendError,
  handleProgressEvent,
  HttpClient,
  ProgressCallback,
  RequestCancelable,
  SyntheticErrorLabel,
} from '../../http/';
import {RequestCancellationError} from '../../user';
import {MemberData, Members} from '../member/';
import {TeamAPI} from '../team/TeamAPI';

export class MemberAPI {
  // Maximum 1600 due to "413 Request Entity Too Large" response
  private static readonly DEFAULT_MEMBERS_CHUNK_SIZE = 1600;
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    MEMBERS: 'members',
    CSV: 'csv',
    MEMBERS_BY_ID_LIST: 'get-members-by-ids-using-post',
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

  public async putMembers(teamId: string, member: UpdatedMemberData): Promise<void> {
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
   * This endpoint returns all members of the a team.
   * If the queried team is a large team the `hasMore` flag will switch to `true`.
   * Supplying the paging state from the last response will return the next page of results.
   */
  public async getAllMembers(teamId: string, maxResults = 2000, pagingState?: string): Promise<Members> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}`,
      params: {
        maxResults: maxResults,
        pagingState: pagingState,
      },
    };

    const response = await this.client.sendJSON<Members>(config);
    return response.data;
  }

  public async getMembers(
    teamId: string,
    parameters: {ids: string[]},
    limit = MemberAPI.DEFAULT_MEMBERS_CHUNK_SIZE,
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
      data: {user_ids: parameters.ids},
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS_BY_ID_LIST}`,
    };

    const response = await this.client.sendJSON<Members>(config);
    return response.data;
  }

  public async getMemberListCSV(
    teamId: string,
    progressCallback?: ProgressCallback,
  ): Promise<RequestCancelable<MemberCSVResponse>> {
    const cancelSource = axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      onDownloadProgress: handleProgressEvent(progressCallback),
      responseType: 'arraybuffer',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${MemberAPI.URL.MEMBERS}/${MemberAPI.URL.CSV}`,
    };

    const handleRequest = async (): Promise<MemberCSVResponse> => {
      try {
        const response = await this.client.sendRequest<ArrayBuffer>(config);
        return {
          buffer: response.data,
          mimeType: response.headers['content-type'],
        };
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Member CSV download got cancelled.');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }
}
