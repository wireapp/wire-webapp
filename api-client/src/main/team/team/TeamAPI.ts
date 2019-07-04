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

export class TeamAPI {
  constructor(private readonly client: HttpClient) {}

  static URL = {
    TEAMS: '/teams',
  };

  public postTeam(team: NewTeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: team,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}`,
    };

    return this.client.sendJSON(config).then(response => response.headers['location']);
  }

  public async putTeam(team: TeamData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        icon: team.icon,
        name: team.name,
      },
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${team.id}`,
    };

    await this.client.sendJSON(config);
  }

  public getTeams(): Promise<TeamChunkData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}`,
    };

    return this.client.sendJSON<TeamChunkData>(config).then(response => response.data);
  }

  public getTeam(teamId: string): Promise<TeamData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}`,
    };

    return this.client.sendJSON<TeamData>(config).then(response => response.data);
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
