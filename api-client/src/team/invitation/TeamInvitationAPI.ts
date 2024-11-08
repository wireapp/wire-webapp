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
import {StatusCodes as StatusCode} from 'http-status-codes';

import {
  InvitationInvalidEmailError,
  InvitationEmailExistsError,
  InvitationNotFoundError,
  InvitationMultipleError,
} from './InvitationError';
import {TeamMigrationPayload} from './TeamMigrationPayload';

import {HttpClient, BackendErrorLabel, BackendError} from '../../http/';
import {NewTeamInvitation, TeamInvitation, TeamInvitationChunk} from '../invitation/';
import {TeamAPI} from '../team/';

export class TeamInvitationAPI {
  public static readonly MAX_CHUNK_SIZE = 100;
  public static readonly URL = {
    INFO: 'info',
    INVITATIONS: 'invitations',
    EMAIL: 'by-email',
    ACCEPT: 'accept',
    UPGRADE_PERSONAL_TO_TEAM: 'upgrade-personal-to-team',
  };

  constructor(private readonly client: HttpClient) {}

  public async getInvitation(teamId: string, invitationId: string): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    const response = await this.client.sendJSON<TeamInvitation>(config);
    return response.data;
  }

  public async getAllInvitations(teamId: string): Promise<TeamInvitation[]> {
    let allInvitations: TeamInvitation[] = [];

    let invitationChunk = await this.getInvitations(teamId, undefined);
    allInvitations = allInvitations.concat(invitationChunk.invitations);
    while (invitationChunk.has_more) {
      const invitations = invitationChunk.invitations;
      const lastInvitation = invitations[invitations.length - 1] || {};
      const lastChunkId = (lastInvitation as TeamInvitation).id;
      invitationChunk = await this.getInvitations(teamId, lastChunkId);
      allInvitations = allInvitations.concat(invitationChunk.invitations);
    }

    return allInvitations;
  }

  public async getInvitations(
    teamId: string,
    startId?: string,
    limit = TeamInvitationAPI.MAX_CHUNK_SIZE,
  ): Promise<TeamInvitationChunk> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: startId,
      },
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}`,
    };

    const response = await this.client.sendJSON<TeamInvitationChunk>(config);
    return response.data;
  }

  public async deleteInvitation(teamId: string, invitationId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    await this.client.sendJSON(config);
  }

  public async headInvitation(email: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'head',
      params: {
        email,
      },
      url: `${TeamAPI.URL.TEAMS}/${TeamInvitationAPI.URL.INVITATIONS}/${TeamInvitationAPI.URL.EMAIL}`,
    };

    try {
      await this.client.sendJSON(config);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response?.status;
        switch (status) {
          case StatusCode.NOT_FOUND: {
            throw new InvitationNotFoundError('Invitation not found');
          }
          case StatusCode.CONFLICT: {
            throw new InvitationMultipleError('Multiple invitations found');
          }
        }
      }
      throw error;
    }
  }

  public async postInvitation(teamId: string, invitation: NewTeamInvitation): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      data: invitation,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamInvitationAPI.URL.INVITATIONS}`,
    };

    try {
      const response = await this.client.sendJSON<TeamInvitation>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.INVITE_EMAIL_EXISTS: {
          throw new InvitationEmailExistsError(backendError.message);
        }
        case BackendErrorLabel.INVALID_EMAIL: {
          throw new InvitationInvalidEmailError(backendError.message);
        }
      }
      throw error;
    }
  }

  public async getInvitationFromCode(invitationCode: string): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code: invitationCode,
      },
      url: `${TeamAPI.URL.TEAMS}/${TeamInvitationAPI.URL.INVITATIONS}/${TeamInvitationAPI.URL.INFO}`,
    };

    const response = await this.client.sendJSON<TeamInvitation>(config);
    return response.data;
  }

  public async acceptInvitation(payload: {code: string; password: string}): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      data: payload,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${TeamInvitationAPI.URL.INVITATIONS}/${TeamInvitationAPI.URL.ACCEPT}`,
    };

    const response = await this.client.sendJSON<TeamInvitation>(config);
    return response.data;
  }

  public async upgradePersonalToTeamUser({
    iconKey,
    icon = 'default',
    name,
    currency,
  }: TeamMigrationPayload): Promise<TeamInvitation> {
    const config: AxiosRequestConfig = {
      data: {icon_key: iconKey, icon, name, currency},
      method: 'post',
      url: `/${TeamInvitationAPI.URL.UPGRADE_PERSONAL_TO_TEAM}`,
    };

    const response = await this.client.sendJSON<TeamInvitation>(config);
    return response.data;
  }
}
