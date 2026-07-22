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

import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client';
import {AxiosError} from 'axios';
import {StatusCodes} from 'http-status-codes';

import {APIClient} from '@wireapp/api-client';

import {ClientService} from './clientService';

import {wipeCoreCryptoDb} from '../messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper';
import {getUUID} from '../test/payloadHelper';
import {createMemoryEngine} from '../test/storeHelper';
import {ProteusService} from '../messagingProtocols/proteus';

jest.mock('../messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper', () => ({
  ...jest.requireActual('../messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper'),
  wipeCoreCryptoDb: jest.fn().mockResolvedValue(undefined),
}));

const wipeCoreCryptoDbMock = wipeCoreCryptoDb as jest.Mock;

const clientNotFoundError = () => {
  const error = new AxiosError('Not Found');
  error.response = {status: StatusCodes.NOT_FOUND} as AxiosError['response'];
  return error;
};

describe('ClientService', () => {
  const createdApiClients: APIClient[] = [];

  const buildClientService = async () => {
    const apiClient = new APIClient({urls: APIClient.BACKEND.STAGING});
    createdApiClients.push(apiClient);
    const storeEngine = await createMemoryEngine(`client-service-test-${getUUID()}`);
    const proteusService = {wipe: jest.fn()} as unknown as ProteusService;

    const clientService = new ClientService(apiClient, proteusService, storeEngine);

    return {apiClient, storeEngine, proteusService, clientService};
  };

  const localClient: RegisteredClient = {
    id: 'stale-client-id',
    type: ClientType.PERMANENT,
    time: new Date().toISOString(),
  } as RegisteredClient;

  afterEach(() => {
    wipeCoreCryptoDbMock.mockClear();
    createdApiClients.forEach(client => client.disconnect());
    createdApiClients.length = 0;
  });

  describe('loadClient', () => {
    it('wipes the proteus identity and the CoreCrypto/MLS keystore when the local client no longer exists on the backend', async () => {
      const {apiClient, storeEngine, proteusService, clientService} = await buildClientService();
      await storeEngine.create('clients', 'local_identity', localClient);

      jest.spyOn(apiClient.api.client, 'getClient').mockRejectedValue(clientNotFoundError());

      const result = await clientService.loadClient();

      expect(result).toBeUndefined();
      expect(proteusService.wipe).toHaveBeenCalledTimes(1);
      expect(wipeCoreCryptoDbMock).toHaveBeenCalledTimes(1);
      expect(wipeCoreCryptoDbMock).toHaveBeenCalledWith(storeEngine);
    });

    it('does not wipe any identity data when the local client still exists on the backend', async () => {
      const {apiClient, storeEngine, proteusService, clientService} = await buildClientService();
      await storeEngine.create('clients', 'local_identity', localClient);

      jest.spyOn(apiClient.api.client, 'getClient').mockResolvedValue(localClient);

      const result = await clientService.loadClient();

      expect(result).toBeDefined();
      expect(proteusService.wipe).not.toHaveBeenCalled();
      expect(wipeCoreCryptoDbMock).not.toHaveBeenCalled();
    });

    it('returns undefined without wiping anything when there is no local client', async () => {
      const {proteusService, clientService} = await buildClientService();

      const result = await clientService.loadClient();

      expect(result).toBeUndefined();
      expect(proteusService.wipe).not.toHaveBeenCalled();
      expect(wipeCoreCryptoDbMock).not.toHaveBeenCalled();
    });
  });
});
