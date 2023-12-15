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

import {OidcClientData} from './OIDCService.types';

const TargetURLKey = 'E2EIdentity_OIDCService_TargetURL';
const clientDataKey = 'E2EIdentity_OIDCService_ClientData';

const OIDCServiceStore = {
  store: {
    clientData: (data: OidcClientData) => localStorage.setItem(clientDataKey, JSON.stringify(data)),
    targetURL: (url: string) => localStorage.setItem(TargetURLKey, url),
  },
  get: {
    clientData: (): OidcClientData => {
      // MOCK: store targetURL and clientData in OIDCServiceStore
      // TODO: remove this once we have a proper OIDC service
      return {
        id: 'wireapp',
        secret: 'dUpVSGx2dVdFdGQ0dmsxWGhDalQ0SldU',
      };
      /*
      const clientData = localStorage.getItem(clientDataKey);
      if (!clientData) {
        throw new Error('No client data found in OIDCServiceStore');
      }
      return JSON.parse(clientData);
      */
    },
    targetURL: () => localStorage.getItem(TargetURLKey),
  },
  has: {
    clientData: () => localStorage.getItem(clientDataKey) !== null,
    targetURL: () => localStorage.getItem(TargetURLKey) !== null,
  },
  clear: {
    clientData: () => localStorage.removeItem(clientDataKey),
    targetURL: () => localStorage.removeItem(TargetURLKey),
    all: () => {
      OIDCServiceStore.clear.targetURL();
      OIDCServiceStore.clear.clientData();
    },
  },
};

export {OIDCServiceStore};
