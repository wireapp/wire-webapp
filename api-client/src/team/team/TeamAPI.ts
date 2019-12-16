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

import {NewTeamData, TeamChunkData, TeamData} from '../';
import {HttpClient} from '../../http/';
import {UpdateTeamData} from './UpdateTeamData';

export class TeamAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    TEAMS: '/teams',
  };

  public async postTeam(team: NewTeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: team,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}`,
    };

    const response = await this.client.sendJSON(config);
    return response.headers['location'];
  }

  public async putTeam(teamId: string, teamData: UpdateTeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: teamData,
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    await this.client.sendJSON(config);
  }

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

  public async deleteTeam(teamId: string, password: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    await this.client.sendJSON(config);
  }
}
