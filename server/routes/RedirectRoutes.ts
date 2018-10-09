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
import * as BrowserUtil from '../BrowserUtil';
import {ServerConfig} from '../config';

const STATUS_CODE_FOUND = 302;

const router = express.Router();

const RedirectRoutes = (config: ServerConfig) => [
  router.get('/join/?', (req, res) => {
    const key = req.query.key;
    const code = req.query.code;
    res.redirect(STATUS_CODE_FOUND, `/auth/?join_key=${key}&join_code=${code}#join-conversation`);
  }),
  router.get('/browser/?', (req, res) => {
    const userAgent = req.headers['user-agent'];
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    if (!parseResult) {
      res.redirect(STATUS_CODE_FOUND, '/unsupported/');
    } else {
      res.json(parseResult);
    }
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
