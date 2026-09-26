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

import {AxiosError, AxiosHeaders} from 'axios';

import {APIClient} from '@wireapp/api-client';
import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client';
import {MemoryEngine} from '@wireapp/store-engine';

import {ClientDatabaseRepository} from './clientDatabaseRepository';
import {ClientService} from './clientService';

import type {ProteusService} from '../messagingProtocols/proteus';

const CLIENT_ID = 'a8e7c8599fd5eb1d';

const registeredClient = {
  id: CLIENT_ID,
  type: ClientType.PERMANENT,
  class: 'desktop',
  time: new Date().toISOString(),
} as unknown as RegisteredClient;

async function buildService(withLocalClient = true) {
  const storeEngine = new MemoryEngine();
  await storeEngine.init('clientService.test');
  if (withLocalClient) {
    await new ClientDatabaseRepository(storeEngine).createLocalClient(registeredClient, 'wire.com');
  }

  const getClient = jest.fn().mockResolvedValue(registeredClient);
  const apiClient = {api: {client: {getClient}}, context: {}} as unknown as APIClient;
  const proteusService = {wipe: jest.fn().mockResolvedValue(undefined)} as unknown as ProteusService;

  return {service: new ClientService(apiClient, proteusService, storeEngine), storeEngine, getClient, proteusService};
}

function notFound(): AxiosError {
  return new AxiosError('Not Found', '404', undefined, undefined, {
    status: 404,
    statusText: 'Not Found',
    data: {},
    headers: {},
    config: {headers: new AxiosHeaders()},
  });
}

describe('ClientService.loadClient', () => {
  it('returns the stored client when it is known to the backend', async () => {
    const {service, getClient} = await buildService();

    const client = await service.loadClient();

    expect(client?.id).toBe(CLIENT_ID);
    expect(getClient).toHaveBeenCalledWith(CLIENT_ID);
  });

  it('returns undefined without contacting the backend when no local client is stored', async () => {
    const {service, getClient} = await buildService(false);

    await expect(service.loadClient()).resolves.toBeUndefined();
    expect(getClient).not.toHaveBeenCalled();
  });

  it('rethrows a database read failure instead of reporting a missing client', async () => {
    // A closed, corrupt or unwritable IndexedDB must not be mistaken for a deleted device:
    // callers wipe the local history when they see "no client".
    const {service, storeEngine, getClient} = await buildService();
    jest.spyOn(storeEngine, 'read').mockRejectedValue(new Error('Database has been closed'));

    await expect(service.loadClient()).rejects.toThrow('Database has been closed');
    expect(getClient).not.toHaveBeenCalled();
  });

  it('keeps the stored client when refreshing it in the database fails', async () => {
    // Disk full: the read succeeds but the write-back throws (QuotaExceededError in browsers).
    const {service, storeEngine} = await buildService();
    jest.spyOn(storeEngine, 'update').mockRejectedValue(new Error('QuotaExceededError'));

    const client = await service.loadClient();

    expect(client?.id).toBe(CLIENT_ID);
  });

  it('wipes the identity and returns undefined when the backend no longer knows the client', async () => {
    const {service, getClient, proteusService} = await buildService();
    getClient.mockRejectedValue(notFound());

    await expect(service.loadClient()).resolves.toBeUndefined();
    expect(proteusService.wipe).toHaveBeenCalled();
  });
});
