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

import express from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {ClientConfig, ServerConfig} from '../config';
import * as BrowserUtil from '../util/BrowserUtil';

const router = express.Router();

export const RedirectRoutes = (config: ServerConfig, clientConfig: ClientConfig) => [
  router.get('/robots.txt', async (req, res) => {
    const robotsContent = (config.ROBOTS.ALLOWED_HOSTS as ReadonlyArray<string>).includes(req.hostname)
      ? config.ROBOTS.ALLOW
      : config.ROBOTS.DISALLOW;
    return res.contentType('text/plain; charset=UTF-8').send(robotsContent);
  }),
  router.get('/join/?', (req, res) => {
    const key = req.query.key;
    const code = req.query.code;
    res.redirect(HTTP_STATUS.MOVED_TEMPORARILY, `/auth/?join_key=${key}&join_code=${code}#/join-conversation`);
  }),
  router.get('/browser/?', (req, res, next) => {
    if (config.DEVELOPMENT) {
      return next();
    }
    const userAgent = req.header('User-Agent');
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    return res.json(parseResult);
  }),
  router.get('/test/agent/?', (req, res) => {
    const userAgent = req.header('User-Agent');
    const parseResult = BrowserUtil.parseUserAgent(userAgent);
    return res.json(parseResult);
  }),
  router.get('/commit/?', (_req, res) => {
    return res.send(config.COMMIT);
  }),
  router.get('/version/?', (_req, res) => {
    return res.json({version: config.VERSION});
  }),
  /**
   * This route is used by the OIDC Provider to redirect the user back to the client.
   * The OIDC Provider will redirect the user to this route with a query string containing the necessary information for the client to complete the authentication.
   */
  router.get('/oidc?', (_req, res) => {
    const {query} = _req;
    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key] as string)}`)
      .join('&');
    return res.redirect(
      HTTP_STATUS.MOVED_TEMPORARILY,
      `/?${queryString ? queryString : 'no_query=true'}#/e2ei-redirect`,
    );
  }),
];
