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
import * as logdown from 'logdown';
import {formatDate} from '../../util/TimeUtil';

const router = express.Router();

const logger = logdown('@wireapp/wire-webapp/routes/error/errorRoutes', {
  logger: console,
  markdown: false,
});

const InternalErrorRoute = (): express.ErrorRequestHandler => (err, req, res, next) => {
  logger.error(`[${formatDate()}] ${err.stack}`);
  const error = {
    code: 500,
    message: 'Internal server error',
    stack: err.stack,
  };
  const request = {
    date: req.headers.date,
    host: req.hostname,
    ip: req.ip,
    url: req.url,
  };
  req.app.locals.error = error;
  req.app.locals.request = request;
  return res.render('error');
};

const NotFoundRoute = () =>
  router.get('*', (req, res) => {
    const error = {
      code: 404,
      message: 'Not found',
    };
    const request = {
      date: req.headers.date,
      host: req.hostname,
      ip: req.ip,
      url: req.url,
    };
    req.app.locals.error = error;
    req.app.locals.request = request;
    return res.render('error');
  });

export {InternalErrorRoute, NotFoundRoute};
