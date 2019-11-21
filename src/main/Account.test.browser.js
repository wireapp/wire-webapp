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
const UUID = require('pure-uuid');
const {Account} = require('@wireapp/core');
const {IndexedDBEngine} = require('@wireapp/store-engine-dexie');
const {APIClient} = require('@wireapp/api-client');

const UUIDVersion = 4;

describe('Account', () => {
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
      storeName = new UUID(UUIDVersion).format();
      const db = new Dexie(storeName);
      db.version(1).stores({
        amplify: '',
        clients: ', meta.primary_key',
        keys: '',
        prekeys: '',
        sessions: '',
      });
      const engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });

      const context = {
        clientId: 'aa9ecc1b-ed3a-49fc-987d-68d69ce59c0d',
        userId: new UUID(UUIDVersion),
      };

      const account = new Account(apiClient, () => Promise.resolve(engine));
      await account.init(engine);
      spyOn(account.service.client, 'register').and.callThrough();
      account.service.client.synchronizeClients = () => Promise.resolve();
      account.service.notification.backend.getLastNotification = () => Promise.resolve({id: 'notification-id'});
      account.apiClient.context = {};
      account.apiClient.client.api.postClient = () => Promise.resolve({id: context.clientId});
      await account.initClient(context);

      expect(account.service.client.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadAndValidateLocalClient', () => {
    it('synchronizes the client ID', async () => {
      const engine = new IndexedDBEngine();
      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });
      const clientId = new UUID(UUIDVersion).toString();
      const account = new Account(apiClient, () => Promise.resolve(engine));
      await account.init(engine);
      spyOn(account.service.cryptography, 'initCryptobox').and.returnValue(Promise.resolve());
      spyOn(account.service.client, 'getLocalClient').and.returnValue(Promise.resolve({id: clientId}));
      spyOn(account.apiClient.client.api, 'getClient').and.returnValue(Promise.resolve({id: clientId}));
      account.apiClient.createContext('userId', 'clientType', 'clientId');

      await account.loadAndValidateLocalClient();

      expect(account.apiClient.context.clientId).toBe(clientId);
    });
  });

  describe('registerClient', () => {
    it('synchronizes the client ID', async () => {
      const engine = new IndexedDBEngine();
      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });
      const clientId = new UUID(UUIDVersion).toString();
      const account = new Account(apiClient, () => Promise.resolve(engine));
      await account.init(engine);
      spyOn(account.service.client, 'register').and.returnValue(Promise.resolve({id: clientId}));
      spyOn(account.service.client, 'synchronizeClients').and.returnValue(Promise.resolve());
      spyOn(account.service.notification, 'initializeNotificationStream').and.returnValue(Promise.resolve());
      account.apiClient.createContext('userId', 'clientType', 'clientId');

      await account.registerClient();

      expect(account.apiClient.context.clientId).toBe(clientId);
    });
  });
});
