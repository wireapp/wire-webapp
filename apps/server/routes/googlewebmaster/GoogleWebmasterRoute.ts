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

import type {ServerConfig} from '@wireapp/config';

export const GoogleWebmasterRoute = (config: ServerConfig) => {
  if (config.GOOGLE_WEBMASTER_ID) {
    return Router().get(`/google${config.GOOGLE_WEBMASTER_ID}.html`, (_req, res) => {
      const responseBody = `google-site-verification: google${config.GOOGLE_WEBMASTER_ID}.html`;
      res.type('text/html; charset=utf-8').send(responseBody);
    });
  }
  return Router();
};
