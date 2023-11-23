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

// MOCK: store targetURL and clientData in OIDCServiceStore
// TODO: remove this once we have a proper OIDC service
OIDCServiceStore.store.clientData({
  id: 'wireapp',
  secret: 'dUpVSGx2dVdFdGQ0dmsxWGhDalQ0SldU',
});

// lots of hardcoded values here, but this is just for testing until we have a proper OIDC service
export const getOIDCServiceInstance = (): OIDCService => {
  const targetURL = OIDCServiceStore.get.targetURL();
  const clientData = OIDCServiceStore.get.clientData();

  // if there is no targetURL, we cannot create an OIDCService
  if (!targetURL) {
    throw new Error('No target URL found in OIDCServiceStore');
  }
  // if there is no clientData ID, we cannot create an OIDCService
  if (!clientData || !clientData.id) {
    throw new Error('No client data found in OIDCServiceStore');
  }

  const oidcService = new OIDCService({
    oidcClient: clientData,
    authorityUrl: targetURL,
    redirectUri: `${location.origin}/oidc`,
  });
  return oidcService;
};
