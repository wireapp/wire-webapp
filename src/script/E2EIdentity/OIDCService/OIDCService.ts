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

import {OIDCServiceStore} from './OIDCServiceStorage';

export class OIDCService {
  private userManager: UserManager;

  constructor() {
    // Get the targetURL from the OIDCServiceStore
    // It has been set by the E2EIdentityEnrollment
    const targetURL = OIDCServiceStore.get.targetURL();

    // if there is no targetURL, we cannot create an OIDCService
    if (!targetURL) {
      throw new Error('No target URL found in OIDCServiceStore');
    }

    // Extract the clientId from the targetURL
    const idpUrl = new URL(targetURL);
    // This clientId will be used to create the OIDCService, it is mocked for now
    const idpClientId = 'wireapp';
    //const idpClientId = idpUrl.searchParams.get('clientId');
    if (!idpClientId) {
      throw new Error('No clientId provided by the targetUrl');
    }
    // This secret is only used for testing and needs to be removed in the future
    const idpClientSecret = 'dUpVSGx2dVdFdGQ0dmsxWGhDalQ0SldU';

    // Build the proxy url and redirect uri
    const currentOrigin = location.origin;
    const authorityUrl = idpUrl.origin + idpUrl.pathname;
    const proxyUrl = `${currentOrigin}/oidcProxy?targetUrl=${authorityUrl}`;
    const redirectUri = `${currentOrigin}/oidc`;

    const dexioConfig: UserManagerSettings = {
      authority: proxyUrl,
      client_id: idpClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email offline_access',
      client_secret: idpClientSecret,
    };

    this.userManager = new UserManager(dexioConfig);
  }

  public async authenticate(): Promise<void> {
    await this.userManager.signinRedirect({extraQueryParams: {shouldBeRedirectedByProxy: true}});
  }

  public async handleAuthentication(): Promise<User | undefined> {
    // Remove the hash (hash router) from the url before processing
    const url = window.location.href.replace('/#', '');

    const user = await this.userManager.signinCallback(url);

    if (!user) {
      return undefined;
    }

    return user;
  }

  public clearProgress(): Promise<void> {
    const {localStorage, sessionStorage} = window;
    // remove all oidc keys from local and session storage to prevent errors and stale state
    clearKeysStartingWith('oidc.', localStorage);
    clearKeysStartingWith('oidc.user:', sessionStorage);
    return this.userManager.clearStaleState();
  }
}
