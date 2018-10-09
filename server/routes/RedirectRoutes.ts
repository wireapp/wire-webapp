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
import * as path from 'path';

import * as BrowserUtil from '../BrowserUtil';
import {ServerConfig} from '../config';
import {fileIsReadable} from '../FileUtil';

const STATUS_CODE_FOUND = 302;
const STATUS_CODE_NOT_FOUND = 404;

const router = express.Router();

const RedirectRoutes = (config: ServerConfig) => [
  router.get('/robots.txt', async (req, res) => {
    const robotsDir = path.join(__dirname, '..', 'robots');
    const robotsAllowFile = path.join(robotsDir, 'robots.txt');
    const robotsDisallowFile = path.join(robotsDir, 'robots-disallow.txt');

    if (req.host === 'app.wire.com') {
      const fileReadable = await fileIsReadable(robotsAllowFile);
      return fileReadable ? res.sendFile(robotsAllowFile) : res.sendStatus(STATUS_CODE_NOT_FOUND);
    } else {
      const fileReadable = await fileIsReadable(robotsDisallowFile);
      return fileReadable ? res.sendFile(robotsDisallowFile) : res.sendStatus(STATUS_CODE_NOT_FOUND);
    }
  }),
  router.get('/join/?', (req, res) => {
    const key = req.query.key;
    const code = req.query.code;
    res.redirect(STATUS_CODE_FOUND, `/auth/?join_key=${key}&join_code=${code}#join-conversation`);
  }),
  router.get('/browser/?', (req, res, next) => {
    if (config.SERVER.DEVELOPMENT) {
      return next();
    }
    const userAgent = req.headers['user-agent'];
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    if (!parseResult) {
      return res.redirect(STATUS_CODE_FOUND, '/unsupported/');
    }

    return res.json(parseResult);
  }),
  router.get('/test/agent/?', (req, res) => {
    const userAgent = req.headers['user-agent'];
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    return res.json(parseResult);
  }),
  router.get('/test/:error/?', (req, res) => {
    try {
      const errorCode = parseInt(req.params.error, 10);
      return res.sendStatus(errorCode);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }),
  router.get('/version/?', (req, res) => {
    return res.contentType('text/plain; charset=UTF-8').send(config.CLIENT.VERSION);
  }),
];

export default RedirectRoutes;
