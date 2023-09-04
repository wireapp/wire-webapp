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

import {OIDCService} from './OIDCService';
import {OIDCServiceStore} from './OIDCServiceStorage';

// lots of hardcoded values here, but this is just for testing until we have a proper OIDC service
export const getOIDCServiceInstance = (): OIDCService => {
  // if there is no targetURL, we cannot create an OIDCService
  if (!OIDCServiceStore.has.targetURL()) {
    throw new Error('OIDCServiceStore has no targetURL');
  }
  const targetURL = OIDCServiceStore.get.targetURL();
  const oidcService = new OIDCService({
    audience: '338888153072-ktbh66pv3mr0ua0dn64sphgimeo0p7ss.apps.googleusercontent.com',
    authorityUrl: 'https://accounts.google.com' || targetURL,
    redirectUri: 'https://local.elna.wire.link:8081/oidc',
    clientSecret: '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',
  });
  return oidcService;
};
