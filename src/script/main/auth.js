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

import resolveDependency from '../config/appResolver';

import AudioRepository from '../audio/AudioRepository';
import BackendClient from '../service/BackendClient';

window.z = window.z || {};
window.z.main = z.main || {};

class Auth {
  /**
   * Constructs objects needed for app authentication.
   *
   * @param {AudioRepository} audioRepository - Audio repository
   * @param {BackendClient} backendClient - Client for the API calls
   * @returns {Auth} New authentication object
   */
  constructor(audioRepository, backendClient) {
    this.audio = audioRepository;
    this.backendClient = backendClient;
    this.service = new z.auth.AuthService(this.backendClient);
    this.repository = new z.auth.AuthRepository(this.service);
    return this;
  }
}

//##############################################################################
// Setting up the Environment (DIST)
//##############################################################################
$(() => {
  const defaultEnvironment = z.util.Environment.frontend.isProduction()
    ? z.service.BackendEnvironment.PRODUCTION
    : z.service.BackendEnvironment.DEVELOPMENT;
  const env = z.util.URLUtil.getParameter(z.auth.URLParameter.ENVIRONMENT) || defaultEnvironment;

  const isStaging = env === z.service.BackendEnvironment.DEVELOPMENT;
  const settings = isStaging
    ? {
        environment: z.service.BackendEnvironment.DEVELOPMENT,
        restUrl: 'https://staging-nginz-https.zinfra.io',
        webSocketUrl: 'wss://staging-nginz-ssl.zinfra.io',
      }
    : {
        environment: z.service.BackendEnvironment.PRODUCTION,
        restUrl: window.wire.env.BACKEND_REST || 'https://prod-nginz-https.wire.com',
        webSocketUrl: window.wire.env.BACKEND_WS || 'wss://prod-nginz-ssl.wire.com',
      };

  const audioRepository = resolveDependency(AudioRepository);
  const backendClient = resolveDependency(BackendClient);
  backendClient.setSettings(settings);

  window.wire = Object.assign(window.wire || {}, {
    auth: new Auth(audioRepository, backendClient),
  });
});
