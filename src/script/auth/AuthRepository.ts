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

import {AccessTokenData, LoginData} from '@wireapp/api-client/dist/auth';
import {amplify} from 'amplify';
import ko from 'knockout';
import {Environment} from 'Util/Environment';
import {Logger, getLogger} from 'Util/Logger';
import {loadValue, resetStoreValue, storeValue} from 'Util/StorageUtil';
import {TIME_IN_MILLIS, formatTimestamp} from 'Util/TimeUtil';
import {WebAppEvents} from '../event/WebApp';
import {QUEUE_STATE} from '../service/QueueState';
import {StorageKey} from '../storage/StorageKey';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {AuthService} from './AuthService';
import {SIGN_OUT_REASON} from './SignOutReason';

export class AuthRepository {
  private accessTokenRefresh: number;
  private readonly authService: AuthService;
  private readonly logger: Logger;
  private readonly queueState: ko.Observable<QUEUE_STATE>;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      REFRESH_THRESHOLD: TIME_IN_MILLIS.MINUTE,
    };
  }

  static get ACCESS_TOKEN_TRIGGER(): {
    IMMEDIATE: string;
    SCHEDULED: string;
    TEAMS_REGISTRATION: string;
    UNAUTHORIZED_REQUEST: string;
    WEB_SOCKET: string;
  } {
    return {
      IMMEDIATE: 'AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE',
      SCHEDULED: 'AuthRepository.ACCESS_TOKEN_TRIGGER.SCHEDULED',
      TEAMS_REGISTRATION: 'AuthRepository.ACCESS_TOKEN_TRIGGER.TEAMS_REGISTRATION',
      UNAUTHORIZED_REQUEST: 'AuthRepository.ACCESS_TOKEN_TRIGGER.UNAUTHORIZED_REQUEST',
      WEB_SOCKET: 'AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET',
    };
  }

  constructor(authService: AuthService) {
    this.accessTokenRefresh = undefined;
    this.authService = authService;
    this.logger = getLogger('AuthRepository');

    this.queueState = this.authService.backendClient.queueState;

    amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, this.renewAccessToken.bind(this));
  }

  login(login: LoginData, persist: boolean): Promise<AccessTokenData> {
    return this.authService.postLogin(login, persist).then(accessTokenResponse => {
      this.saveAccessToken(accessTokenResponse);
      storeValue(StorageKey.AUTH.PERSIST, persist);
      storeValue(StorageKey.AUTH.SHOW_LOGIN, true);
      return accessTokenResponse;
    });
  }

  logout(): Promise<void> {
    return this.authService
      .postLogout()
      .then(() => this.logger.info('Log out on backend successful'))
      .catch(error => this.logger.warn(`Log out on backend failed: ${error.message}`, error));
  }

  requestLoginCode(requestCode: {force: number; phone: string}): Promise<{expires_in: number}> {
    return this.authService.postLoginSend(requestCode);
  }

  renewAccessToken(renewalTrigger: string): void {
    const isRefreshingToken = this.queueState() === QUEUE_STATE.ACCESS_TOKEN_REFRESH;

    if (!isRefreshingToken) {
      this.queueState(QUEUE_STATE.ACCESS_TOKEN_REFRESH);
      this.authService.backendClient.scheduleQueueUnblock();
      this.logger.info(`Access token renewal started. Source: ${renewalTrigger}`);

      this.getAccessToken()
        .then(() => {
          this.authService.backendClient.executeRequestQueue();
          amplify.publish(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEWED);
        })
        .catch(error => {
          const {message, type} = error;
          const isRequestForbidden = type === z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN;
          if (isRequestForbidden || Environment.frontend.isLocalhost()) {
            this.logger.warn(`Session expired on access token refresh: ${message}`, error);
            window.Raygun.send(error);
            return amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.SESSION_EXPIRED, false);
          }

          this.queueState(QUEUE_STATE.READY);
          this.logger.error(`Refreshing access token failed: '${type}'`, error);
          return amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        });
    }
  }

  deleteAccessToken(): void {
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TTL);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE);
  }

  getCachedAccessToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      const accessToken = loadValue<string>(StorageKey.AUTH.ACCESS_TOKEN.VALUE);
      const accessTokenType = loadValue<string>(StorageKey.AUTH.ACCESS_TOKEN.TYPE);

      if (accessToken) {
        this.logger.info('Cached access token found in Local Storage', {accessToken});
        this.authService.saveAccessTokenInClient(accessTokenType, accessToken);
        this.scheduleTokenRefresh(loadValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION));
        return resolve();
      }

      return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE));
    });
  }

  getAccessToken(): Promise<AccessTokenData> {
    return this.authService.postAccess().then(accessToken => this.saveAccessToken(accessToken));
  }

  saveAccessToken(accessTokenResponse: AccessTokenData): AccessTokenData {
    const {access_token: accessToken, expires_in: expiresIn, token_type: accessTokenType} = accessTokenResponse;
    const expiresInMillis = expiresIn * TIME_IN_MILLIS.SECOND;
    const expirationTimestamp = Date.now() + expiresInMillis;

    storeValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE, accessToken, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expirationTimestamp, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.TTL, expiresInMillis, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE, accessTokenType, expiresIn);

    this.authService.saveAccessTokenInClient(accessTokenType, accessToken);

    this.logAccessTokenUpdate(accessTokenResponse, expirationTimestamp);
    this.scheduleTokenRefresh(expirationTimestamp);
    return accessTokenResponse;
  }

  private logAccessTokenUpdate(accessTokenResponse: Object, expirationTimestamp: number): void {
    const expirationDate = formatTimestamp(expirationTimestamp, false);
    this.logger.info(`Saved updated access token. It will expire on: ${expirationDate}`, accessTokenResponse);
  }

  private scheduleTokenRefresh(expirationTimestamp: number): void {
    if (this.accessTokenRefresh) {
      window.clearTimeout(this.accessTokenRefresh);
    }
    const callbackTimestamp = expirationTimestamp - AuthRepository.CONFIG.REFRESH_THRESHOLD;

    if (callbackTimestamp < Date.now()) {
      return this.renewAccessToken(AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE);
    }
    const refreshDate = formatTimestamp(callbackTimestamp, false);
    this.logger.info(`Scheduling next access token refresh for '${refreshDate}'`);

    this.accessTokenRefresh = window.setTimeout(() => {
      if (callbackTimestamp > Date.now() + 15000) {
        this.logger.info(`Access token refresh scheduled for '${refreshDate}' skipped because it was executed late`);
      }

      if (navigator.onLine) {
        return this.renewAccessToken(`Schedule for '${refreshDate}'`);
      }

      this.logger.info(`Access token refresh scheduled for '${refreshDate}' skipped because we are offline`);
    }, callbackTimestamp - Date.now());
  }
}
