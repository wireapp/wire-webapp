/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe, task, type Task} from 'true-myth';
import {ClientType} from '../../../apiClient/client/clientType';
import type {RegisteredClient} from '../../../apiClient/client/registeredClient';
import {
  CONVERSATION_PROTOCOL,
  FEATURE_STATUS,
  type FeatureList,
} from '../../../apiClient/team/feature/featureList.types';
import type {Account} from '../../../core';
import type {MetaClient} from '../../../core/client/clientService';

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {ClientActionCreator} from '../action/creator/';

import {actionRoot} from '.';

describe('ClientAction', () => {
  it('registers a new client only for confirmed absence', async () => {
    const client = {id: 'new-client'} as MetaClient;
    const registerClient = jest.fn().mockResolvedValue(client);
    const initClient = jest.fn().mockResolvedValue(client);
    const store = mockStoreFactory({
      actions: actionRoot,
      core: {
        getLocalClient(): Task<Maybe<MetaClient>, Error> {
          return task.resolve(Maybe.nothing());
        },
        registerClient,
        initClient,
      },
    })({});

    await store.dispatch(actionRoot.clientAction.doInitializeClient(ClientType.PERMANENT));

    expect(registerClient).toHaveBeenCalledTimes(1);
    expect(store.getActions()).toEqual([ClientActionCreator.successfulInitializeClient({isNew: true, client})]);
  });

  it('does not register or initialize a client after a failed lookup', async () => {
    const lookupError = new Error('Client service unavailable');
    const registerClient = jest.fn();
    const initClient = jest.fn();
    const store = mockStoreFactory({
      actions: actionRoot,
      core: {
        getLocalClient(): Task<Maybe<MetaClient>, Error> {
          return task.reject(lookupError);
        },
        registerClient,
        initClient,
      },
    })({});

    await expect(store.dispatch(actionRoot.clientAction.doInitializeClient(ClientType.PERMANENT))).rejects.toBe(
      lookupError,
    );
    expect(registerClient).not.toHaveBeenCalled();
    expect(initClient).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([]);
  });

  it.each([
    ['default clock', {}, 1000],
    [
      'injected clock at the migration deadline',
      {
        clock: createDeterministicClock({
          initialUnixEpochMicroseconds: BigInt(Date.parse('2026-09-23T12:00:00Z')) * 1_000n,
        }),
      },
      100,
    ],
  ] as const)('initializes MLS with the %s', async (_name, clockParameters, expectedAllowance) => {
    const client = {id: 'client-id'} as RegisteredClient;
    const features: FeatureList = {
      mls: {
        status: FEATURE_STATUS.ENABLED,
        config: {
          allowedCipherSuites: [1],
          defaultCipherSuite: 1,
          defaultProtocol: CONVERSATION_PROTOCOL.MLS,
          protocolToggleUsers: [],
          supportedProtocols: [CONVERSATION_PROTOCOL.MLS],
        },
      },
      mlsMigration: {
        status: FEATURE_STATUS.ENABLED,
        config: {finaliseRegardlessAfter: '2026-09-23T12:00:00Z'},
      },
    };
    const initClient: Account['initClient'] = async (localClient, config) => {
      expect(config?.getNbKeyPackages?.()).toBe(expectedAllowance);
      return localClient;
    };
    const store = mockStoreFactory({
      ...clockParameters,
      actions: actionRoot,
      core: {
        getLocalClient(): Task<Maybe<MetaClient>, Error> {
          return task.resolve(Maybe.just(client as MetaClient));
        },
        service: {
          team: {
            getCommonFeatureConfig: async () => {
              return features;
            },
          },
        } as Account['service'],
        initClient,
      },
    })({});

    await store.dispatch(actionRoot.clientAction.doInitializeClient(ClientType.PERMANENT));

    expect(store.getActions()).toEqual([ClientActionCreator.successfulInitializeClient({isNew: false, client})]);
  });

  it('fetches all self clients', async () => {
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        client: {
          getClients: () => {
            return Promise.resolve([]);
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.clientAction.doGetAllClients());

    expect(store.getActions()).toEqual([
      ClientActionCreator.startGetAllClients(),
      ClientActionCreator.successfulGetAllClients([]),
    ]);
  });

  it('handles failed fetch of all self clients', async () => {
    const backendError = new Error() as any;
    backendError.code = HTTP_STATUS.FORBIDDEN;
    backendError.label = 'invalid-credentials';
    backendError.message = 'Authentication failed.';
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        client: {
          getClients: () => {
            return Promise.reject(backendError);
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await expect(store.dispatch(actionRoot.clientAction.doGetAllClients())).rejects.toMatchObject({
      code: backendError.code,
      label: backendError.label,
      message: backendError.message,
    });
    expect(store.getActions()).toEqual([
      ClientActionCreator.startGetAllClients(),
      ClientActionCreator.failedGetAllClients(backendError),
    ]);
  });

  it('removes a self client', async () => {
    const clientId = 'clientId';
    const password = 'password';
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        client: {
          deleteClient: () => {
            return Promise.resolve();
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.clientAction.doRemoveClient(clientId, password));

    expect(store.getActions()).toEqual([
      ClientActionCreator.startRemoveClient(),
      ClientActionCreator.successfulRemoveClient(clientId),
    ]);
  });

  it('handles failed self client removal', async () => {
    const clientId = 'clientId';
    const password = 'password';
    const backendError = new Error() as any;
    backendError.code = HTTP_STATUS.FORBIDDEN;
    backendError.label = 'invalid-credentials';
    backendError.message = 'Authentication failed.';
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        client: {
          deleteClient: () => {
            return Promise.reject(backendError);
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await expect(store.dispatch(actionRoot.clientAction.doRemoveClient(clientId, password))).rejects.toMatchObject({
      code: backendError.code,
      label: backendError.label,
      message: backendError.message,
    });
    expect(store.getActions()).toEqual([
      ClientActionCreator.startRemoveClient(),
      ClientActionCreator.failedRemoveClient(backendError),
    ]);
  });
});
