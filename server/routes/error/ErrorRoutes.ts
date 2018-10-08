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
import {formatDate} from '../../TimeUtil';

const router = express.Router();

const logger = logdown('@wireapp/wire-web-ets/routes/error/errorRoutes', {
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
  return res.sendStatus(error.code);
};

const NotFoundRoute = () =>
  router.get('*', (req, res) => {
    const error = {
      code: 404,
      message: 'Not found',
    };
    return res.sendStatus(error.code);
  });

export {InternalErrorRoute, NotFoundRoute};
