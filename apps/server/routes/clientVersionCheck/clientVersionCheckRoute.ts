/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import is from '@sindresorhus/is';
import {Router} from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {result, type Result} from 'true-myth';

import {setNonCacheHeaders} from '../redirectRoutes';

type ClientVersionCheckRouteDependencies = {
  readonly router: ReturnType<typeof Router>;
  readonly parseClientVersion: (clientVersionHeaderValue: string) => Result<Date, Error>;
  readonly deployedClientVersion: string;
  readonly isClientVersionEnforcementEnabled: boolean;
};

export function createClientVersionCheckRoute(dependencies: ClientVersionCheckRouteDependencies) {
  const {router, parseClientVersion, deployedClientVersion, isClientVersionEnforcementEnabled} = dependencies;

  return router.get('/client-version-check', (request, response) => {
    setNonCacheHeaders(response);

    const clientVersionHeaderValue = request.header('Wire-Client-Version');

    if (is.undefined(clientVersionHeaderValue) || is.emptyStringOrWhitespace(clientVersionHeaderValue)) {
      return response.sendStatus(HTTP_STATUS.BAD_REQUEST);
    }

    const parsedClientVersion = parseClientVersion(clientVersionHeaderValue);

    if (result.isErr(parsedClientVersion)) {
      return response.sendStatus(HTTP_STATUS.BAD_REQUEST);
    }

    if (!isClientVersionEnforcementEnabled) {
      return response.sendStatus(HTTP_STATUS.OK);
    }

    if (clientVersionHeaderValue === deployedClientVersion) {
      return response.sendStatus(HTTP_STATUS.OK);
    }

    return response.status(HTTP_STATUS.UPGRADE_REQUIRED).json({action: 'reload'});
  });
}
