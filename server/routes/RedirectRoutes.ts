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

import * as express from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {ServerConfig} from '../ServerConfig';
import * as BrowserUtil from '../util/BrowserUtil';

const router = express.Router();

export const RedirectRoutes = (config: ServerConfig) => [
  router.get('/robots.txt', async (req, res) => {
    const robotsContent = config.SERVER.ROBOTS.ALLOWED_HOSTS.includes(req.hostname)
      ? config.SERVER.ROBOTS.ALLOW
      : config.SERVER.ROBOTS.DISALLOW;
    return res.contentType('text/plain; charset=UTF-8').send(robotsContent);
  }),
  router.get('/join/?', (req, res) => {
    const key = req.query.key;
    const code = req.query.code;
    res.redirect(HTTP_STATUS.MOVED_TEMPORARILY, `/auth/?join_key=${key}&join_code=${code}#join-conversation`);
  }),
  router.get('/browser/?', (req, res, next) => {
    if (config.SERVER.DEVELOPMENT) {
      return next();
    }
    const userAgent = req.header('User-Agent');
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    if (!parseResult) {
      return res.redirect(HTTP_STATUS.MOVED_TEMPORARILY, `${config.CLIENT.URL.WEBSITE_BASE}/unsupported/`);
    }

    return res.json(parseResult);
  }),
  router.get('/test/agent/?', (req, res) => {
    const userAgent = req.header('User-Agent');
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    return res.json(parseResult);
  }),
  router.get('/commit/?', (req, res) => {
    return res.send(config.COMMIT);
  }),
  router.get('/version/?', (req, res) => {
    return res.json({version: config.CLIENT.VERSION});
  }),
];
