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

import type {Clock} from '@enormora/clock/clock';
import {AxiosError, AxiosResponse} from 'axios';

import type {APIClient} from '../../apiClient/apiClient';
import {ClientType} from '../../apiClient/client/clientType';
import type {RegisteredClient} from '../../apiClient/client/registeredClient';
import {BackendError} from '../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import type {ProteusService} from '../messagingProtocols/proteus';
import {LowDiskSpaceError} from '../storage/engine/error';
import {MemoryEngine} from '../storage/engine/memoryEngine';

import {ClientDatabaseRepository} from './clientDatabaseRepository';
import {ClientService} from './clientService';

const createAxiosError = (status?: number): AxiosError => {
  const response = status === undefined ? undefined : ({status} as AxiosResponse);
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response);
};

type Setup = {
  clientService: ClientService;
  getClient: jest.Mock;
  localClient: RegisteredClient;
  proteusService: {wipe: jest.Mock};
  storeEngine: MemoryEngine;
};

async function setup({clientType = ClientType.PERMANENT, storeLocalClient = true} = {}): Promise<Setup> {
  const storeEngine = new MemoryEngine();
  await storeEngine.init('ClientService.test');

  const localClient = {id: 'local-client', type: clientType} as RegisteredClient;
  if (storeLocalClient) {
    await new ClientDatabaseRepository(storeEngine).createLocalClient(localClient);
  }

  const getClient = jest.fn();
  const proteusService = {wipe: jest.fn()};
  const apiClient = {api: {client: {getClient}}} as unknown as APIClient;
  const clientService = new ClientService(
    apiClient,
    proteusService as unknown as ProteusService,
    storeEngine,
    {} as Clock,
  );

  return {clientService, getClient, localClient, proteusService, storeEngine};
}

describe('ClientService.loadClient', () => {
  it('returns undefined without asking the backend when there is no local client', async () => {
    const {clientService, getClient} = await setup({storeLocalClient: false});

    await expect(clientService.loadClient()).resolves.toBeUndefined();
    expect(getClient).not.toHaveBeenCalled();
  });

  it('returns the local client updated with the backend data', async () => {
    const {clientService, getClient, localClient} = await setup();
    getClient.mockResolvedValue({...localClient, label: 'updated'});

    await expect(clientService.loadClient()).resolves.toEqual(
      expect.objectContaining({id: localClient.id, label: 'updated'}),
    );
  });

  it('throws when the local client cannot be read', async () => {
    const {clientService, getClient, proteusService, storeEngine} = await setup();
    const databaseError = new Error('Internal error opening backing store for indexedDB.open.');
    jest.spyOn(storeEngine, 'read').mockRejectedValue(databaseError);

    await expect(clientService.loadClient()).rejects.toBe(databaseError);
    expect(getClient).not.toHaveBeenCalled();
    expect(proteusService.wipe).not.toHaveBeenCalled();
  });

  it('throws when the local client cannot be updated', async () => {
    const {clientService, getClient, localClient, proteusService, storeEngine} = await setup();
    getClient.mockResolvedValue(localClient);
    const diskFullError = new LowDiskSpaceError('Out of disk space');
    jest.spyOn(storeEngine, 'update').mockRejectedValue(diskFullError);

    await expect(clientService.loadClient()).rejects.toBe(diskFullError);
    expect(proteusService.wipe).not.toHaveBeenCalled();
  });

  it.each([
    ['a backend error', new BackendError('Server error', BackendErrorLabel.SERVER_ERROR, 500)],
    ['a network error', createAxiosError()],
    ['an HTTP error without body', createAxiosError(503)],
  ])('throws and keeps local data when the backend request fails with %s', async (_, backendError) => {
    const {clientService, getClient, proteusService} = await setup();
    getClient.mockRejectedValue(backendError);

    await expect(clientService.loadClient()).rejects.toBe(backendError);
    expect(proteusService.wipe).not.toHaveBeenCalled();
  });

  it.each([
    ['a backend error', new BackendError('Client not found', BackendErrorLabel.NOT_FOUND, 404)],
    ['an HTTP error without body', createAxiosError(404)],
  ])('returns undefined and wipes the identity when the backend answers 404 with %s', async (_, notFoundError) => {
    const {clientService, getClient, proteusService, storeEngine} = await setup();
    getClient.mockRejectedValue(notFoundError);
    const clearTables = jest.spyOn(storeEngine, 'clearTables');

    await expect(clientService.loadClient()).resolves.toBeUndefined();
    expect(proteusService.wipe).toHaveBeenCalled();
    expect(clearTables).not.toHaveBeenCalled();
  });

  it('clears all tables when a temporary client is not found on the backend', async () => {
    const {clientService, getClient, storeEngine} = await setup({clientType: ClientType.TEMPORARY});
    getClient.mockRejectedValue(new BackendError('Client not found', BackendErrorLabel.NOT_FOUND, 404));
    const clearTables = jest.spyOn(storeEngine, 'clearTables');

    await expect(clientService.loadClient()).resolves.toBeUndefined();
    expect(clearTables).toHaveBeenCalled();
  });
});
