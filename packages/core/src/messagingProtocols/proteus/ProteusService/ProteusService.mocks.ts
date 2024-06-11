/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ClientType} from '@wireapp/api-client/lib/client';

import {APIClient} from '@wireapp/api-client';

import {CryptoClient} from './CryptoClient';
import {CoreCryptoWrapper} from './CryptoClient/CoreCryptoWrapper/CoreCryptoWrapper';
import {ProteusService} from './ProteusService';

import {getUUID} from '../../../test/PayloadHelper';

export const buildProteusService = async (): Promise<
  [ProteusService, {apiClient: APIClient; cryptoClient: CryptoClient}]
> => {
  const apiClient = new APIClient({urls: APIClient.BACKEND.STAGING});

  apiClient.context = {
    clientType: ClientType.NONE,
    userId: getUUID(),
    clientId: getUUID(),
  };

  const cryptoClient = new CoreCryptoWrapper({} as any, {} as any);

  const proteusService = new ProteusService(apiClient, cryptoClient, {
    nbPrekeys: 0,
  });
  return [proteusService, {apiClient, cryptoClient}];
};
