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

export interface VerifyDomainRedirectConfig {
  domain: string;
  backend: {
    config_url: string;
    webapp_url: string;
  };
  domainRedirect: 'remove' | 'backend' | 'no-registration';
}

export interface DomainVerificationChallenge {
  dns_verification_token: string;
  id: string;
  token: string;
}

export interface VerifyChallengeRequest {
  domain: string;
  challengeId: string;
  challengeToken: string;
}

export interface VerifyChallenge {
  domain_ownership_token: string;
}

export type TeamInvite = 'allowed' | 'not-allowed' | 'team';
export type DomainRedirect = 'none' | 'locked' | 'sso' | 'backend' | 'no-registration' | 'pre-authorized';

export type TeamInviteConfig = {
  domain: string;
  sso?: string;
  team?: string;
  domainRedirect?: DomainRedirect;
  teamInvite?: TeamInvite;
};

export interface GetAllRegisteredDomains {
  registered_domains: RegisteredDomain[];
}

export interface RegisteredDomain {
  authorized_team: string;
  backend: {
    config_url: string;
    webapp_url: string;
  };
  dns_verification_token: string;
  domain: string;
  domain_redirect: DomainRedirect;
  sso_code: string;
  team: string;
  team_invite: TeamInvite;
}
