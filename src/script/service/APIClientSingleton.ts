/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {singleton} from 'tsyringe';

import {APIClient as APIClientUnconfigured} from '@wireapp/api-client';

import {Config} from '../Config';
const REST_URL = 'https://nginz-https';
const WS_URL = 'wss://nginz-ssl';

@singleton()
export class APIClient extends APIClientUnconfigured {
  constructor() {
    // eslint-disable-next-line no-console
    console.log('APIClient', document.location, Config.getConfig().APP_BASE === document.location.origin, {
      rest: REST_URL + document.location.host.slice(document.location.host.indexOf('.')),
      ws: WS_URL + document.location.host.slice(document.location.host.indexOf('.')),
    });
    super({
      urls: {
        name: Config.getConfig().ENVIRONMENT,
        rest:
          Config.getConfig().APP_BASE === document.location.origin || Config.getConfig().BACKEND_REST?.includes('test')
            ? Config.getConfig().BACKEND_REST
            : REST_URL + document.location.host.slice(document.location.host.indexOf('.')),
        ws:
          Config.getConfig().APP_BASE === document.location.origin
            ? Config.getConfig().BACKEND_WS
            : WS_URL + document.location.host.slice(document.location.host.indexOf('.')),
      },
    });
  }
}
