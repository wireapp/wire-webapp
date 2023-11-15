/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {UserManager, User, UserManagerSettings} from 'oidc-client-ts';

import {clearKeysStartingWith} from 'Util/localStorage';

import {OidcClientData} from './OIDCService.types';

interface OIDCServiceConfig {
  authorityUrl: string;
  redirectUri: string;
  oidcClient: OidcClientData;
}

export class OIDCService {
  private userManager: UserManager;

  constructor(config: OIDCServiceConfig) {
    const {
      authorityUrl,
      redirectUri,
      oidcClient: {id, secret},
    } = config;
    const dexioConfig: UserManagerSettings = {
      authority: authorityUrl,
      client_id: id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email offline_access',
      client_secret: secret,
      extraQueryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    };

    this.userManager = new UserManager(dexioConfig);
  }

  public async authenticate(): Promise<void> {
    await this.userManager.signinRedirect();
  }

  public handleAuthentication(): Promise<User> {
    // Remove the hash (hash router) from the url before processing
    const url = window.location.href.replace('/#', '');

    return this.userManager.signinRedirectCallback(url).then(user => {
      return user;
    });
  }

  public clearProgress(): Promise<void> {
    const {localStorage, sessionStorage} = window;
    // remove all oidc keys from local and session storage to prevent errors and stale state
    clearKeysStartingWith('oidc.', localStorage);
    clearKeysStartingWith('oidc.user:', sessionStorage);
    return this.userManager.clearStaleState();
  }
}
