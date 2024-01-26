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

import {KeyAuth} from '@wireapp/core/lib/messagingProtocols/mls';
import {UserManager, User, UserManagerSettings, WebStorageStateStore} from 'oidc-client-ts';

import {clearKeysStartingWith} from 'Util/localStorage';
import {Logger, getLogger} from 'Util/Logger';

import {EncryptedStorage} from './OauthEncryptedStore';
import {OIDCServiceStore} from './OIDCServiceStorage';

export class OIDCService {
  private readonly userManager: UserManager;
  private readonly logger: Logger;

  constructor(secretKey: Uint8Array) {
    // Get the targetURL from the OIDCServiceStore
    // It has been set by the E2EIdentityEnrollment
    const targetURL = OIDCServiceStore.get.targetURL();

    // if there is no targetURL, we cannot create an OIDCService
    if (!targetURL) {
      throw new Error('No target URL found in OIDCServiceStore');
    }

    // Extract the clientId from the targetURL
    const idpUrl = new URL(targetURL);
    // This clientId will be used to create the OIDCService. It needs to be attached to the targetURL
    const idpClientId = idpUrl.searchParams.get('client_id');
    if (!idpClientId) {
      throw new Error('No clientId provided by the targetUrl');
    }

    // Build the proxy url and redirect uri
    const currentOrigin = location.origin;
    const authorityUrl = idpUrl.origin + idpUrl.pathname;
    const redirectUri = `${currentOrigin}/oidc`;

    const dexioConfig: UserManagerSettings = {
      authority: authorityUrl,
      client_id: idpClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email offline_access',
      extraQueryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      automaticSilentRenew: false,
      stateStore: new WebStorageStateStore({store: window.sessionStorage}),
      userStore: new WebStorageStateStore({
        store: new EncryptedStorage(secretKey),
      }),
    };

    this.userManager = new UserManager(dexioConfig);
    this.logger = getLogger('OIDC Service');
  }

  public async authenticate(keyAuth: KeyAuth, challengeUrl: string): Promise<void> {
    // New claims value for keycloak
    const claims = {
      id_token: {
        keyauth: {essential: true, value: keyAuth},
        acme_aud: {essential: true, value: challengeUrl},
      },
    };

    await this.userManager.signinRedirect({
      extraQueryParams: {shouldBeRedirectedByProxy: true, claims: JSON.stringify(claims)},
    });
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

  public clearProgress(includeUserData: boolean = false): Promise<void> {
    if (includeUserData) {
      const {localStorage} = window;
      // remove all oidc keys from local and session storage to prevent errors and stale state
      clearKeysStartingWith('oidc.', localStorage);
      clearKeysStartingWith('oidc.user:', localStorage);
    }
    return this.userManager.clearStaleState();
  }

  public async handleSilentAuthentication(): Promise<User | null> {
    try {
      return this.userManager.signinSilent();
    } catch (error) {
      this.logger.log('Silent authentication with refresh token failed', error);
    }
    return null;
  }
}
