/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {OIDCProxyRoutePath, getTargetUrlWithQueryParams} from './common';
import {OIDCProxy} from './proxy';

export const OIDCProxyRoute = () => {
  return Router().use(OIDCProxyRoutePath, (req, res, next) => {
    // Redirect to the target URL if the shouldBeRedirected query parameter is set
    const {shouldBeRedirected, targetUrlWithQueryParams} = getTargetUrlWithQueryParams(req);

    //console.log(shouldBeRedirected, targetUrlWithQueryParams);
    if (shouldBeRedirected) {
      return res.redirect(targetUrlWithQueryParams.href);
    }

    // Apply the proxy middleware
    OIDCProxy(req, res, next);
  });
};
