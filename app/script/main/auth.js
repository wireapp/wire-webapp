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
window.z.main = z.main || {};

z.main.Auth = class Auth {
  /**
   * Constructs objects needed for app authentication.
   *
   * @param {Object} settings - Collection of URL settings
   * @param {string} settings.environment - Handle of the backend environment (staging, etc.)
   * @param {string} settings.webSocketUrl - URL to the backend's WebSocket
   * @param {string} settings.restUrl - URL to the backend's REST service
   * @param {string} settings.parameter - Additional parameters for the webapp's login URL
   * @returns {Auth} New authentication object
   */
  constructor(settings) {
    this.settings = settings;
    this.audio = new z.audio.AudioRepository();
    this.backendClient = new z.service.BackendClient(this.settings);
    this.service = new z.auth.AuthService(this.backendClient);
    this.repository = new z.auth.AuthRepository(this.service);
    return this;
  }
};

//##############################################################################
// Setting up the Environment (DIST)
//##############################################################################
$(() => {
  const defaultEnvironment = z.util.Environment.frontend.isProduction()
    ? z.service.BackendEnvironment.PRODUCTION
    : z.service.BackendEnvironment.STAGING;
  const env = z.util.URLUtil.getParameter(z.auth.URLParameter.ENVIRONMENT) || defaultEnvironment;

  const isStaging = env === z.service.BackendEnvironment.STAGING;
  const settings = isStaging
    ? {
        environment: z.service.BackendEnvironment.STAGING,
        restUrl: 'https://staging-nginz-https.zinfra.io',
        webSocketUrl: 'wss://staging-nginz-ssl.zinfra.io',
      }
    : {
        environment: z.service.BackendEnvironment.PRODUCTION,
        restUrl: 'https://prod-nginz-https.wire.com',
        webSocketUrl: 'wss://prod-nginz-ssl.wire.com',
      };

  window.wire = {
    auth: new z.main.Auth(settings),
  };
});
