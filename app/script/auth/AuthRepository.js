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

'use strict';

window.z = window.z || {};
window.z.auth = z.auth || {};

z.auth.AuthRepository = class AuthRepository {
  static get CONFIG() {
    return {
      REFRESH_THRESHOLD: 60 * 1000,
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
   * @param {z.auth.AuthService} authService - Service for authentication interactions with the backend
   */
  constructor(authService) {
    this.accessTokenRefresh = undefined;
    this.authService = authService;
    this.logger = new z.util.Logger('z.auth.AuthRepository', z.config.LOGGER.OPTIONS);

    this.queueState = this.authService.client.queue_state;

    amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, this.renewAccessToken.bind(this));
  }

  /**
   * Print all cookies for a user in the console.
   * @returns {undefined} No return value
   */
  listCookies() {
    this.authService
      .getCookies()
      .then(({cookies}) => {
        this.logger.force_log('Backend cookies:');
        cookies.forEach((cookie, index) => {
          const expirationDate = z.util.format_timestamp(cookie.time, false);
          const log = `Label: ${cookie.label} | Type: ${cookie.type} |  Expiration: ${expirationDate}`;
          this.logger.force_log(`Cookie No. ${index + 1} | ${log}`);
        });
      })
      .catch(error => this.logger.force_log('Could not list user cookies', error));
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
    return this.authService.postLogin(login, persist).then(accessTokenData => {
      this.saveAccessToken(accessTokenData);
      z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.PERSIST, persist);
      z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.SHOW_LOGIN, true);
      return accessTokenData;
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
    const isRefreshingToken = this.queueState() === z.service.QUEUE_STATE.ACCESS_TOKEN_REFRESH;

    if (!isRefreshingToken) {
      this.queueState(z.service.QUEUE_STATE.ACCESS_TOKEN_REFRESH);
      this.authService.client.schedule_queue_unblock();
      this.logger.info(`Access token renewal started. Source: ${renewalTrigger}`);

      this.getAccessToken()
        .then(() => {
          this.authService.client.execute_request_queue();
          amplify.publish(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED);
        })
        .catch(error => {
          const {message, type} = error;
          const isRequestForbidden = type === z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN;
          if (isRequestForbidden || z.util.Environment.frontend.isLocalhost()) {
            this.logger.warn(`Session expired on access token refresh: ${message}`, error);
            Raygun.send(error);
            return amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SIGN_OUT_REASON.SESSION_EXPIRED, false);
          }

          this.queueState(z.service.QUEUE_STATE.READY);
          this.logger.error(`Refreshing access token failed: '${type}'`, error);
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        });
    }
  }

  /**
   * Deletes all access token data stored on the client.
   * @returns {undefined} No return value
   */
  deleteAccessToken() {
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE);
  }

  /**
   * Get the cached access token from the Amplify store.
   * @returns {Promise} Resolves when the access token was retrieved
   */
  getCachedAccessToken() {
    return new Promise((resolve, reject) => {
      const accessToken = z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE);
      const accessTokenType = z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE);

      if (accessToken) {
        this.logger.info('Cached access token found in Local Storage', {access_token: accessToken});
        this.authService.saveAccessTokenInClient(accessTokenType, accessToken);
        this._scheduleTokenRefresh(z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION));
        return resolve();
      }

      return reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE));
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
   * @example Access Token data we expect:
   *  access_token: Lt-IRHxkY9JLA5UuBR3Exxj5lCUf...
   *  access_token_expiration: 1424951321067 => Thu, 26 Feb 2015 11:48:41 GMT
   *  access_token_type: Bearer
   *  access_token_ttl: 900000 => 900s/15min
   *
   * @param {Object|string} accessTokenData - Access Token
   * @option {string} accessTokenData - access_token
   * @option {string} accessTokenData - expires_in
   * @option {string} accessTokenData - type
   * @returns {Object} Access token data
   */
  saveAccessToken(accessTokenData) {
    const expiresInMillis = 1000 * accessTokenData.expires_in;
    const expirationTimestamp = Date.now() + expiresInMillis;

    z.util.StorageUtil.set_value(
      z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE,
      accessTokenData.access_token,
      accessTokenData.expires_in
    );
    z.util.StorageUtil.set_value(
      z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION,
      expirationTimestamp,
      accessTokenData.expires_in
    );
    z.util.StorageUtil.set_value(
      z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL,
      expiresInMillis,
      accessTokenData.expires_in
    );
    z.util.StorageUtil.set_value(
      z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE,
      accessTokenData.token_type,
      accessTokenData.expires_in
    );

    this.authService.saveAccessTokenInClient(accessTokenData.token_type, accessTokenData.access_token);

    this._logAccessTokenUpdate(accessTokenData, expirationTimestamp);
    this._scheduleTokenRefresh(expirationTimestamp);
    return accessTokenData;
  }

  /**
   * Logs the update of the access token.
   *
   * @private
   * @param {Object|string} accessTokenData - Access Token
   * @option {string} accessTokenData - access_token
   * @option {string} accessTokenData - expires_in
   * @option {string} accessTokenData - type
   * @param {number} expirationTimestamp - Timestamp when access token expires
   * @returns {undefined}
   */
  _logAccessTokenUpdate(accessTokenData, expirationTimestamp) {
    const expirationDate = z.util.format_timestamp(expirationTimestamp, false);
    this.logger.info(`Saved updated access token. It will expire on: ${expirationDate}`, accessTokenData);
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
    const refreshDate = z.util.format_timestamp(callbackTimestamp, false);
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
};
