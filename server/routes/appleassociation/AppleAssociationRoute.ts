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

import {Router} from 'express';

import type {ServerConfig} from '../../ServerConfig';

export const AppleAssociationRoute = (config: ServerConfig) =>
  Router().get('/apple-app-site-association', (req, res) => {
    const response = {
      webcredentials: {
        apps: [
          'EDF3JCE8BC.com.wearezeta.zclient.ios',
          'W5KEQBF9B5.com.wearezeta.zclient-alpha',
          'W5KEQBF9B5.com.wearezeta.zclient.ios-development',
          'W5KEQBF9B5.com.wearezeta.zclient.ios-internal',
          'W5KEQBF9B5.com.wearezeta.zclient.ios-release',
        ],
      },
    };

    res.send(response);
  });
