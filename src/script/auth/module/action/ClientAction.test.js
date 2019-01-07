/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {ClientActionCreator} from './creator/';
import ROOT_ACTIONS from './';
import {mockStore} from '../../util/TestUtil';
import BackendError from './BackendError';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client';

function printActions(actions) {
  console.log(JSON.stringify(actions, null, 2)); // eslint-disable-line no-console
}

describe('ClientAction', () => {
  describe('Permanent device', () => {
    it('doesn`t create NewClientError when it is the first', () => {
      const creationStatus = {isNewClient: true};
      const mockedActions = {
        clientAction: {
          doGetAllClients: () => () => Promise.resolve([]),
          generateClientPayload: () => () => Promise.resolve(),
        },
      };
      const mockedApiClient = {};
      const mockedCore = {
        initClient: () => Promise.resolve(creationStatus),
      };

      const store = mockStore(
        {
          selfState: {},
        },
        {
          actions: mockedActions,
          apiClient: mockedApiClient,
          core: mockedCore,
        }
      );
      return store.dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(ClientType.PERMANENT)).then(() => {
        printActions(store.getActions());

        expect(store.getActions()).toEqual([
          ClientActionCreator.startInitializeClient(),
          ClientActionCreator.successfulInitializeClient(creationStatus),
        ]);
      });
    });

    it('does create NewClientError when it is the second', () => {
      const creationStatus = {isNewClient: true};
      const mockedActions = {
        clientAction: {
          doGetAllClients: () => () => Promise.resolve([{id: ''}]),
          generateClientPayload: () => () => Promise.resolve(),
        },
        notificationAction: {
          checkHistory: () => () => Promise.resolve(),
        },
      };
      const mockedApiClient = {};
      const mockedCore = {
        initClient: () => Promise.resolve(creationStatus),
      };

      const store = mockStore(
        {
          selfState: {},
        },
        {
          actions: mockedActions,
          apiClient: mockedApiClient,
          core: mockedCore,
        }
      );
      return store.dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(ClientType.PERMANENT)).catch(expectedError => {
        printActions(store.getActions());

        expect(expectedError.label).toBe(BackendError.LABEL.NEW_CLIENT);
        expect(store.getActions()).toEqual([
          ClientActionCreator.startInitializeClient(),
          ClientActionCreator.successfulInitializeClient(creationStatus),
          ClientActionCreator.failedInitializeClient(expectedError),
        ]);
      });
    });
  });

  describe('Temporary device', () => {
    it('does create NewClientError when it is the first', () => {
      const creationStatus = {isNewClient: true};
      const mockedActions = {
        clientAction: {
          doGetAllClients: () => () => Promise.resolve([]),
          generateClientPayload: () => () => Promise.resolve(),
        },
        notificationAction: {
          checkHistory: () => () => Promise.resolve(),
        },
      };
      const mockedApiClient = {};
      const mockedCore = {
        initClient: () => Promise.resolve(creationStatus),
      };

      const store = mockStore(
        {
          selfState: {},
        },
        {
          actions: mockedActions,
          apiClient: mockedApiClient,
          core: mockedCore,
        }
      );
      return store.dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(ClientType.TEMPORARY)).catch(expectedError => {
        printActions(store.getActions());

        expect(expectedError.label).toBe(BackendError.LABEL.NEW_CLIENT);
        expect(store.getActions()).toEqual([
          ClientActionCreator.startInitializeClient(),
          ClientActionCreator.successfulInitializeClient(creationStatus),
          ClientActionCreator.failedInitializeClient(expectedError),
        ]);
      });
    });

    it('does create NewClientError when it is the second', () => {
      const creationStatus = {isNewClient: true};
      const mockedActions = {
        clientAction: {
          doGetAllClients: () => () => Promise.resolve([{id: ''}]),
          generateClientPayload: () => () => Promise.resolve(),
        },
        notificationAction: {
          checkHistory: () => () => Promise.resolve(),
        },
      };
      const mockedApiClient = {};
      const mockedCore = {
        initClient: () => Promise.resolve(creationStatus),
      };

      const store = mockStore(
        {
          selfState: {},
        },
        {
          actions: mockedActions,
          apiClient: mockedApiClient,
          core: mockedCore,
        }
      );
      return store.dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(ClientType.TEMPORARY)).catch(expectedError => {
        printActions(store.getActions());

        expect(expectedError.label).toBe(BackendError.LABEL.NEW_CLIENT);
        expect(store.getActions()).toEqual([
          ClientActionCreator.startInitializeClient(),
          ClientActionCreator.successfulInitializeClient(creationStatus),
          ClientActionCreator.failedInitializeClient(expectedError),
        ]);
      });
    });
  });
});
