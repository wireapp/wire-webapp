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

import Axios, {AxiosRequestConfig} from 'axios';

import {LeadData} from './LeadData';
import {TeamSizeData} from './TeamSizeData';
import {UpdateTeamData} from './UpdateTeamData';

import {NewTeamData, TeamChunkData, TeamData} from '../';
import {BackendError, HttpClient, RequestCancelable, SyntheticErrorLabel} from '../../http/';
import {RequestCancellationError} from '../../user';

export class TeamAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    SIZE: 'size',
    TEAMS: '/teams',
    CONSENT: '/consent',
    MARKETO: 'marketo',
    LEAD: 'lead',
  };

  public async postTeam(team: NewTeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: team,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}`,
    };

    await this.client.sendJSON(config);
  }

  public async putTeam(teamId: string, teamData: UpdateTeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: teamData,
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    await this.client.sendJSON(config);
  }
  /** @deprecated
   * from api V2 this endpoint will not work, please use getTeam instead */
  public async getTeams(): Promise<TeamChunkData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}`,
    };

    const response = await this.client.sendJSON<TeamChunkData>(config);
    return response.data;
  }

  public async getTeam(teamId: string): Promise<TeamData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    const response = await this.client.sendJSON<TeamData>(config);
    return response.data;
  }

  public async deleteTeam(teamId: string, password: string, verificationCode?: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
        ...(verificationCode && {verification_code: verificationCode}),
      },
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    await this.client.sendJSON(config);
  }

  public async getTeamSize(teamId: string): Promise<RequestCancelable<TeamSizeData>> {
    const cancelSource = Axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.SIZE}`,
    };

    const handleRequest = async () => {
      try {
        const response = await this.client.sendJSON<TeamSizeData>(config);
        return response.data;
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Team size request got cancelled');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }

  public async postLead(data: LeadData): Promise<any> {
    const config: AxiosRequestConfig = {
      data,
      method: 'post',
      url: `${TeamAPI.URL.CONSENT}/${TeamAPI.URL.MARKETO}/${TeamAPI.URL.LEAD}`,
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }

  public async putLead(data: LeadData): Promise<any> {
    const config: AxiosRequestConfig = {
      data,
      method: 'put',
      url: `${TeamAPI.URL.CONSENT}/${TeamAPI.URL.MARKETO}/${TeamAPI.URL.LEAD}`,
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }
}
