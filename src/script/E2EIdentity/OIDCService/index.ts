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
  const targetURL = OIDCServiceStore.get.targetURL();

  // if there is no targetURL, we cannot create an OIDCService
  if (!targetURL) {
    throw new Error('No target URL found in OIDCServiceStore');
  }

  const idpUrl = new URL(targetURL);
  const idpClientId = idpUrl.searchParams.get('clientId');

  // if there is no clientData ID, we cannot create an OIDCService
  if (!idpClientId) {
    throw new Error('No clientId provided by the targetUrl');
  }

  const oidcService = new OIDCService({
    oidcClient: {
      id: idpClientId,
      // this is a secret that is only used for testing and needs to be removed by backend
      secret: 'dUpVSGx2dVdFdGQ0dmsxWGhDalQ0SldU',
    },
    authorityUrl: idpUrl.origin + idpUrl.pathname,
    redirectUri: `${location.origin}/oidc`,
  });
  return oidcService;
};
