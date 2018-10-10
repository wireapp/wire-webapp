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
import {ServerConfig} from '../../config';

const ConfigRoute = (config: ServerConfig) =>
  Router().get('/config.js', (req, res) => {
    res.type('application/javascript').send(`
      window.APP_NAME = '${config.CLIENT.APP_NAME}';
      window.BASE = '${config.SERVER.BASE}';
      window.BACKEND_HTTP = '${config.CLIENT.BACKEND_HTTP}';
      window.BACKEND_WS = '${config.CLIENT.BACKEND_WS}';
      window.ENVIRONMENT = '${config.CLIENT.ENVIRONMENT}';
      window.VERSION = '${config.CLIENT.VERSION}';
      window.EXTERNAL_ACCOUNT_BASE = '${config.CLIENT.EXTERNAL_ACCOUNT_BASE}';
      window.EXTERNAL_WEBSITE_BASE = '${config.CLIENT.EXTERNAL_WEBSITE_BASE}';
      window.EXTERNAL_MOBILE_BASE = '${config.CLIENT.EXTERNAL_MOBILE_BASE}';
    `);
  });

export default ConfigRoute;
