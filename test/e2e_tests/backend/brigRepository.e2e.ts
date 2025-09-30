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

import axios, {AxiosInstance} from 'axios';

const BASIC_AUTH = process.env.BASIC_AUTH;

export class BrigRepositoryE2E {
  readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.BACKEND_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getActivationCodeForEmail(email: string): Promise<string> {
    const activationCodeResponse = await this.axiosInstance.get(`/i/users/activation-code`, {
      params: {email: email},
      headers: {
        Authorization: `Basic ${BASIC_AUTH}`,
      },
    });

    return activationCodeResponse.data.code;
  }

  public async getTeamInvitationCodeForEmail(teamId: string, invitationId: string): Promise<string> {
    const invitationCodeResponse = await this.axiosInstance.get(`/i/teams/invitation-code`, {
      params: {
        team: teamId,
        invitation_id: invitationId,
      },
      headers: {
        Authorization: `Basic ${BASIC_AUTH}`,
      },
    });

    return invitationCodeResponse.data.code;
  }

  public async unlockConferenceCallingFeature(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/conferenceCalling/unlocked`,
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async enableConferenceCallingBackdoorViaBackdoorTeam(teamId: string) {
    await this.axiosInstance.patch(
      `i/teams/${teamId}/features/conferenceCalling`,
      {
        status: 'enabled',
      },
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async unlockChannelFeature(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/channels/unlocked`,
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async unlockSndFactorPasswordChallenge(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/sndFactorPasswordChallenge/unlocked`,
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async unlockAppLock(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/appLock/unlocked`,
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async enableChannelsFeature(teamId: string) {
    await this.axiosInstance.patch(
      `i/teams/${teamId}/features/channels`,
      {
        status: 'enabled',
      },
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async enableMLSFeature(teamId: string) {
    await this.axiosInstance.patch(
      `i/teams/${teamId}/features/mls`,
      {
        status: 'enabled',
        config: {
          protocolToggleUsers: [],
          allowedCipherSuites: [2],
          defaultProtocol: 'mls',
          defaultCipherSuite: 2,
          supportedProtocols: ['mls', 'proteus'],
        },
      },
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async enableAppLock(teamId: string) {
    await this.axiosInstance.patch(
      `i/teams/${teamId}/features/appLock`,
      {
        status: 'enabled',
        config: {
          enforceAppLock: true,
        },
      },
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async unlockCellsFeature(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/cells/unlocked`,
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }

  public async enableCells(teamId: string) {
    await this.axiosInstance.put(
      `i/teams/${teamId}/features/cells`,
      {
        status: 'enabled',
      },
      {
        headers: {
          Authorization: `Basic ${BASIC_AUTH}`,
        },
      },
    );
  }
}
