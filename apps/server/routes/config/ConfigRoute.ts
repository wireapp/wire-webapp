/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {Router} from 'express';

import type {ClientConfig, ServerConfig} from '@wireapp/config';
import {replaceHostname} from '../../util/hostnameReplacer';

export const ConfigRoute = (serverConfig: ServerConfig, clientConfig: ClientConfig) =>
  Router().get('/config.js', (request, res) => {
    const serializedConfig = `window.wire = window.wire || {}; window.wire.env = ${JSON.stringify(clientConfig)};`;
    const payload = serverConfig.ENABLE_DYNAMIC_HOSTNAME
      ? // In case we want URLs that depends on the the hostname, we need to replace the placeholder with the actual hostname.
        replaceHostname(serializedConfig, request)
      : serializedConfig;
    res.type('application/javascript').send(payload);
  });
