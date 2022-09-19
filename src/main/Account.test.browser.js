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

import Dexie from 'dexie';
import UUID from 'uuidjs';
import {Account} from '@wireapp/core';
import {APIClient} from '@wireapp/api-client';
import {ClientClassification, ClientType} from '@wireapp/api-client/src/client';

describe('Account', () => {
  const context = {clientType: ClientType.NONE, userId: 'user'};
  describe('"initClient"', () => {
    let storeName = undefined;

    afterEach(done => {
      if (storeName) {
        const deleteRequest = window.indexedDB.deleteDatabase(storeName);
        deleteRequest.onerror = done.fail;
        deleteRequest.onsuccess = done;
      } else {
        done();
      }
    });

    it('creates a client if there is none', async () => {
      storeName = UUID.genV4().toString();
      const db = new Dexie(storeName);
      db.version(1).stores({
        amplify: '',
        clients: ', meta.primary_key',
        keys: '',
        prekeys: '',
        sessions: '',
      });

      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });

      const context = {
        clientId: 'aa9ecc1b-ed3a-49fc-987d-68d69ce59c0d',
        userId: UUID.genV4().toString(),
      };

      const account = new Account(apiClient);
      await account.initServices(context);
      jest.spyOn(account.service.client, 'register').and.callThrough();
      account.service.client.synchronizeClients = () => Promise.resolve();
      account.service.notification.backend.getLastNotification = () => Promise.resolve({id: 'notification-id'});
      account.apiClient.context = {};
      account.apiClient.api.client.postClient = () => Promise.resolve({id: context.clientId});
      await account.initClient(context, {
        classification: ClientClassification.DESKTOP,
        cookieLabel: 'default',
        model: 'test',
      });

      expect(account.service.client.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadAndValidateLocalClient', () => {
    it('synchronizes the client ID', async () => {
      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });
      const clientId = UUID.genV4().toString().toString();
      const account = new Account(apiClient);
      await account.initServices(context);
      jest.spyOn(account.service.cryptography, 'initCryptobox').mockReturnValue(Promise.resolve());
      jest.spyOn(account.service.client, 'getLocalClient').mockReturnValue(Promise.resolve({id: clientId}));
      jest.spyOn(account.apiClient.api.client, 'getClient').mockReturnValue(Promise.resolve({id: clientId}));
      await account.apiClient.createContext('userId', 'clientType', 'clientId');

      await account.loadAndValidateLocalClient();

      expect(account.apiClient.context.clientId).toBe(clientId);
    });
  });

  describe('registerClient', () => {
    it('synchronizes the client ID', async () => {
      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });
      const clientId = UUID.genV4().toString().toString();
      const account = new Account(apiClient);
      await account.initServices(context);
      jest.spyOn(account.service.client, 'register').mockReturnValue(Promise.resolve({id: clientId}));
      jest.spyOn(account.service.client, 'synchronizeClients').mockReturnValue(Promise.resolve());
      jest.spyOn(account.service.notification, 'initializeNotificationStream').mockReturnValue(Promise.resolve());
      jest.spyOn(account.service.cryptography, 'initCryptobox').mockReturnValue(Promise.resolve());
      await account.apiClient.createContext('userId', 'clientType', 'clientId');

      await account.registerClient(context);

      expect(account.apiClient.context.clientId).toBe(clientId);
    });
  });
});
