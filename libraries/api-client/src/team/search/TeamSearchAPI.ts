/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import Axios, {AxiosRequestConfig} from 'axios';

import {ChannelSearchOptions} from './ChannelSearchOptions';
import {ChannelSearchResult} from './ChannelSearchResult';
import {TeamSearchOptions} from './TeamSearchOptions';
import {TeamSearchResult} from './TeamSearchResult';

import {BackendError, HttpClient, RequestCancelable, SyntheticErrorLabel} from '../../http';
import {RequestCancellationError} from '../../user';
import {TeamAPI} from '../team';

export class TeamSearchAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    CHANNELS: 'channels',
    SEARCH: 'search',
  };

  /**
   * Search for team members.
   * @param query The search query
   * @param options Search options (sort, order, filter, etc.)
   */
  public async getSearchMembers(
    teamId: string,
    query: string,
    options: TeamSearchOptions = {},
  ): Promise<RequestCancelable<TeamSearchResult>> {
    const cancelSource = Axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      params: {
        q: query,
        ...options,
        frole: options.frole?.join(','),
      },
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamSearchAPI.URL.SEARCH}`,
    };

    const handleRequest = async () => {
      try {
        const response = await this.client.sendJSON<TeamSearchResult>(config);
        return response.data;
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Search request got cancelled');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }

  /**
   * Search for channels in a team.
   * @param teamId The team ID
   * @param options Search options (query, sort order, pagination, discoverable filter, etc.)
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/get_teams__tid__channels_search
   */
  public async searchChannels(teamId: string, options: ChannelSearchOptions = {}): Promise<ChannelSearchResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        q: options.q,
        sort_order: options.sort_order,
        page_size: options.page_size,
        last_seen_name: options.last_seen_name,
        last_seen_id: options.last_seen_id,
        discoverable: options.discoverable,
      },
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamSearchAPI.URL.CHANNELS}/${TeamSearchAPI.URL.SEARCH}`,
    };

    const response = await this.client.sendJSON<ChannelSearchResult>(config);
    return response.data;
  }
}
