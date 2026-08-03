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

import {isEmptyStringOrWhitespace, isUndefined} from '@sindresorhus/is';
import {Router} from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {setNonCacheHeaders} from '../../http/setNonCacheHeaders';

const clientAssetVersionHeaderName = 'Wire-Client-Version';

type ClientVersionCheckRouteDependencies = {
  readonly router: ReturnType<typeof Router>;
  readonly deployedAssetVersion: string;
  readonly isClientVersionEnforcementEnabled: boolean;
};

export function createClientVersionCheckRoute(dependencies: ClientVersionCheckRouteDependencies) {
  const {router, deployedAssetVersion, isClientVersionEnforcementEnabled} = dependencies;

  return router.get('/client-version-check', (request, response) => {
    setNonCacheHeaders(response);

    const clientAssetVersionHeaderValue = request.header(clientAssetVersionHeaderName);

    if (isUndefined(clientAssetVersionHeaderValue) || isEmptyStringOrWhitespace(clientAssetVersionHeaderValue)) {
      return response.sendStatus(HTTP_STATUS.BAD_REQUEST);
    }

    if (!isClientVersionEnforcementEnabled || clientAssetVersionHeaderValue === deployedAssetVersion) {
      return response.sendStatus(HTTP_STATUS.OK);
    }

    return response.status(HTTP_STATUS.UPGRADE_REQUIRED).json({action: 'reload'});
  });
}
