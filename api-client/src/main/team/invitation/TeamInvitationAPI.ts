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

import {AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';

import {HttpClient} from '../../http';
import {NewTeamInvitation, TeamInvitation, TeamInvitationChunk} from '../invitation';
import {TeamAPI} from '../team';

class TeamInvitationAPI {
  constructor(private client: HttpClient) {}

  static get URL() {
    return {
      INFO: 'info',
      INVITATIONS: 'invitations',
    };
  }

  public getInvitation(teamId: string, invitationId: string): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getInvitations(teamId: string): Promise<TeamInvitationChunk> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public deleteInvitation(teamId: string, invitationId: string): AxiosPromise {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public postInvitation(teamId: string, invitation: NewTeamInvitation): AxiosPromise {
    const config: AxiosRequestConfig = {
      data: invitation,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getInvitationFromCode(invitationCode: string): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      params: {
        code: invitationCode,
      },
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${TeamInvitationAPI.URL.INVITATIONS}/${TeamInvitationAPI.URL.INFO}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }
}

export {TeamInvitationAPI};
