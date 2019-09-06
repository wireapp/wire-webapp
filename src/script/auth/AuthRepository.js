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

import {TIME_IN_MILLIS, formatTimestamp} from 'Util/TimeUtil';

import {loadValue, storeValue, resetStoreValue} from 'Util/StorageUtil';
import {Environment} from 'Util/Environment';

import {WebAppEvents} from '../event/WebApp';
import {StorageKey} from '../storage/StorageKey';
import {SIGN_OUT_REASON} from './SignOutReason';
import {QUEUE_STATE} from '../service/QueueState';
import {WarningsViewModel} from '../view_model/WarningsViewModel';

export class AuthRepository {
  static get CONFIG() {
    return {
      REFRESH_THRESHOLD: TIME_IN_MILLIS.MINUTE,
    };
  }

  static get ACCESS_TOKEN_TRIGGER() {
    return {
      IMMEDIATE: 'AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE',
      SCHEDULED: 'AuthRepository.ACCESS_TOKEN_TRIGGER.SCHEDULED',
      TEAMS_REGISTRATION: 'AuthRepository.ACCESS_TOKEN_TRIGGER.TEAMS_REGISTRATION',
      UNAUTHORIZED_REQUEST: 'AuthRepository.ACCESS_TOKEN_TRIGGER.UNAUTHORIZED_REQUEST',
      WEB_SOCKET: 'AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET',
    };
  }

  /**
   * Construct a new AuthService
   * @param {AuthService} authService - Service for authentication interactions with the backend
   * @param {Logger} logger - logger configured for this class
   */
  constructor(authService, logger) {
    this.accessTokenRefresh = undefined;
    this.authService = authService;
    this.logger = logger;

    this.queueState = this.authService.backendClient.queueState;

    amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, this.renewAccessToken.bind(this));
  }

  /**
   * Login (with email or phone) in order to obtain an access-token and cookie.
   *
   * @param {Object} login - Containing sign in information
   * @param {string} login.email - Email address for a password login
   * @param {string} login.phone - Phone number for a password or SMS login
   * @param {string} login.password - Password for a password login
   * @param {string} login.code - Login code for an SMS login
   * @param {boolean} persist - Request a persistent cookie instead of a session cookie
   * @returns {Promise} Promise that resolves with the received access token
   */
  login(login, persist) {
    return this.authService.postLogin(login, persist).then(accessTokenResponse => {
      this.saveAccessToken(accessTokenResponse);
      storeValue(StorageKey.AUTH.PERSIST, persist);
      storeValue(StorageKey.AUTH.SHOW_LOGIN, true);
      return accessTokenResponse;
    });
  }

  /**
   * Logout the user on the backend.
   * @returns {Promise} Will always resolve
   */
  logout() {
    return this.authService
      .postLogout()
      .then(() => this.logger.info('Log out on backend successful'))
      .catch(error => this.logger.warn(`Log out on backend failed: ${error.message}`, error));
  }

  /**
   * Request SMS validation code.
   * @param {Object} requestCode - Containing the phone number in E.164 format and whether a code should be forced
   * @returns {Promise} Resolves on success
   */
  requestLoginCode(requestCode) {
    return this.authService.postLoginSend(requestCode);
  }

  /**
   * Renew access-token provided a valid cookie.
   * @param {AuthRepository.ACCESS_TOKEN_TRIGGER} renewalTrigger - Trigger for access token renewal
   * @returns {undefined} No return value
   */
  renewAccessToken(renewalTrigger) {
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
            Raygun.send(error);
            return amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.SESSION_EXPIRED, false);
          }

          this.queueState(QUEUE_STATE.READY);
          this.logger.error(`Refreshing access token failed: '${type}'`, error);
          amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        });
    }
  }

  /**
   * Deletes all access token data stored on the client.
   * @returns {undefined} No return value
   */
  deleteAccessToken() {
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TTL);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE);
  }

  /**
   * Get the cached access token from the Amplify store.
   * @returns {Promise} Resolves when the access token was retrieved
   */
  getCachedAccessToken() {
    return new Promise((resolve, reject) => {
      const accessToken = loadValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE);
      const accessTokenType = loadValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE);

      if (accessToken) {
        this.logger.info('Cached access token found in Local Storage', {accessToken});
        this.authService.saveAccessTokenInClient(accessTokenType, accessToken);
        this._scheduleTokenRefresh(loadValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION));
        return resolve();
      }

      return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE));
    });
  }

  /**
   * Initially get access-token provided a valid cookie.
   * @returns {Promise} Resolves with the access token data
   */
  getAccessToken() {
    return this.authService.postAccess().then(accessToken => this.saveAccessToken(accessToken));
  }

  /**
   * Store the access token using Amplify.
   *
   * @param {Object} accessTokenResponse - Access token data structure
   * @param {string} accessTokenResponse.access_token - Access token
   * @param {string} accessTokenResponse.expires_in - Expiration of access token in seconds
   * @param {string} accessTokenResponse.token_type - Type of access token
   * @returns {Object} Access token data
   */
  saveAccessToken(accessTokenResponse) {
    const {access_token: accessToken, expires_in: expiresIn, token_type: accessTokenType} = accessTokenResponse;
    const expiresInMillis = expiresIn * TIME_IN_MILLIS.SECOND;
    const expirationTimestamp = Date.now() + expiresInMillis;

    storeValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE, accessToken, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expirationTimestamp, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.TTL, expiresInMillis, expiresIn);
    storeValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE, accessTokenType, expiresIn);

    this.authService.saveAccessTokenInClient(accessTokenType, accessToken);

    this._logAccessTokenUpdate(accessTokenResponse, expirationTimestamp);
    this._scheduleTokenRefresh(expirationTimestamp);
    return accessTokenResponse;
  }

  /**
   * Logs the update of the access token.
   *
   * @private
   * @param {Object} accessTokenResponse - Access token data structure
   * @param {number} expirationTimestamp - Timestamp when access token expires
   * @returns {undefined} No return value
   */
  _logAccessTokenUpdate(accessTokenResponse, expirationTimestamp) {
    const expirationDate = formatTimestamp(expirationTimestamp, false);
    this.logger.info(`Saved updated access token. It will expire on: ${expirationDate}`, accessTokenResponse);
  }

  /**
   * Refreshes the access token in time before it expires.
   *
   * @private
   * @note Access token will be refreshed 1 minute (60000ms) before it expires
   * @param {number} expirationTimestamp - The expiration date (and time) as timestamp
   * @returns {undefined} No undefined value
   */
  _scheduleTokenRefresh(expirationTimestamp) {
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
