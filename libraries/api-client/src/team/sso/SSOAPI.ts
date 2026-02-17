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

import {AxiosRequestConfig} from 'axios';

import {
  DomainVerificationChallenge,
  GetAllRegisteredDomains,
  TeamInviteConfig,
  VerifyChallenge,
  VerifyChallengeRequest,
  VerifyDomainRedirectConfig,
} from './SSOAPI.types';

import {HttpClient} from '../../http';
import {TeamAPI} from '../team';

export class SSOAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    AUTHORIZE_TEAM: 'authorize-team',
    BACKEND: 'backend',
    CHALLENGES: 'challenges',
    DOMAIN_VERIFICATION: '/domain-verification',
    REGISTERED_DOMAINS: 'registered-domains',
    TEAM: 'team',
  };

  public async authorizeTeam(domain: string, domainOwnershipToken: string): Promise<unknown> {
    const config: AxiosRequestConfig = {
      data: {
        domain_ownership_token: domainOwnershipToken,
      },
      method: 'post',
      url: `${SSOAPI.URL.DOMAIN_VERIFICATION}/${domain}/${SSOAPI.URL.AUTHORIZE_TEAM}`,
    };

    return await this.client.sendJSON(config);
  }

  public async updateDomainRedirect({domain, backend, domainRedirect}: VerifyDomainRedirectConfig) {
    const config: AxiosRequestConfig = {
      data: {
        backend,
        domainRedirect,
      },
      method: 'post',
      url: `${SSOAPI.URL.DOMAIN_VERIFICATION}/${domain}/${SSOAPI.URL.BACKEND}`,
    };

    const response = await this.client.sendJSON(config);
    return response.data;
  }

  public async domainVerificationChallenge(domain: string): Promise<DomainVerificationChallenge> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${SSOAPI.URL.DOMAIN_VERIFICATION}/${domain}/${SSOAPI.URL.CHALLENGES}`,
    };

    const response = await this.client.sendJSON<DomainVerificationChallenge>(config);
    return response.data;
  }

  public async verifyChallenge({
    domain,
    challengeId,
    challengeToken,
  }: VerifyChallengeRequest): Promise<VerifyChallenge> {
    const config: AxiosRequestConfig = {
      data: {
        challenge_token: challengeToken,
      },
      method: 'post',
      url: `${SSOAPI.URL.DOMAIN_VERIFICATION}/${domain}/${SSOAPI.URL.TEAM}/${SSOAPI.URL.CHALLENGES}/${challengeId}`,
    };

    const response = await this.client.sendJSON<VerifyChallenge>(config);
    return response.data;
  }

  public async updateTeamInvite({domain, sso, team, teamInvite, domainRedirect}: TeamInviteConfig): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        sso,
        team,
        team_invite: teamInvite,
        domain_redirect: domainRedirect,
      },
      method: 'post',
      url: `${SSOAPI.URL.DOMAIN_VERIFICATION}/${domain}/${SSOAPI.URL.TEAM}`,
    };

    await this.client.sendJSON(config);
  }

  public async getAllRegisteredDomains(teamId: string): Promise<GetAllRegisteredDomains> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${SSOAPI.URL.REGISTERED_DOMAINS}`,
    };

    const response = await this.client.sendJSON<GetAllRegisteredDomains>(config);
    return response.data;
  }

  public async deleteRegisteredDomain(teamId: string, domain: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${SSOAPI.URL.REGISTERED_DOMAINS}/${domain}`,
    };

    await this.client.sendJSON(config);
  }
}
