/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {LegalHoldData} from './LegalHoldData';
import {LegalHoldMemberData} from './LegalHoldMemberStatus';
import {NewLegalHoldData} from './NewLegalHoldData';

import {HttpClient} from '../../http';
import {TeamAPI} from '../team/TeamAPI';

export class LegalHoldAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    APPROVE_LEGAL_HOLD: 'approve',
    LEGAL_HOLD: 'legalhold',
    SETTINGS_LEGAL_HOLD: 'settings',
  };

  public async getMemberLegalHold(teamId: string, userId: string): Promise<LegalHoldMemberData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${userId}`,
    };

    const response = await this.client.sendJSON<LegalHoldMemberData>(config);
    return response.data;
  }

  public async deleteMemberLegalHold(teamId: string, userId: string, password: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${userId}`,
    };

    await this.client.sendJSON(config);
  }

  public async postMemberLegalHold(teamId: string, userId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${userId}`,
    };

    await this.client.sendJSON(config);
  }

  public async putMemberApproveLegalHold(teamId: string, userId: string, password: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${userId}/${LegalHoldAPI.URL.APPROVE_LEGAL_HOLD}`,
    };

    await this.client.sendJSON(config);
  }

  public async getSettings(teamId: string): Promise<LegalHoldData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${LegalHoldAPI.URL.SETTINGS_LEGAL_HOLD}`,
    };

    const response = await this.client.sendJSON<LegalHoldData>(config);
    return response.data;
  }

  public async deleteSettings(teamId: string, password: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${LegalHoldAPI.URL.SETTINGS_LEGAL_HOLD}`,
    };

    await this.client.sendJSON(config);
  }

  public async postSettings(teamId: string, legalHoldData: NewLegalHoldData): Promise<LegalHoldData> {
    const config: AxiosRequestConfig = {
      data: legalHoldData,
      method: 'post',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${LegalHoldAPI.URL.LEGAL_HOLD}/${LegalHoldAPI.URL.SETTINGS_LEGAL_HOLD}`,
    };

    const response = await this.client.sendJSON<LegalHoldData>(config);
    return response.data;
  }
}
