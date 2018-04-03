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

const UUID = require('pure-uuid');
const {Account} = require('@wireapp/core');
const {IndexedDBEngine} = require('@wireapp/store-engine');
const Client = require('@wireapp/api-client');

const UUIDVersion = 4;

describe('Account', () => {
  describe('"initClient"', () => {
    let storeName = undefined;

    afterEach(done => {
      if (storeName) {
        const deleteRequest = window.indexedDB.deleteDatabase(storeName);

        deleteRequest.onerror = done.fail;
        deleteRequest.onsuccess = done;
      }
    });

    it('creates a client if there is none', async done => {
      const engine = new IndexedDBEngine();
      const apiClient = new Client({
        schemaCallback: db => {
          db.version(1).stores({
            amplify: '',
            clients: ', meta.primary_key',
            keys: '',
            prekeys: '',
            sessions: '',
          });
        },
        store: engine,
        urls: Client.BACKEND.STAGING,
      });

      const context = {
        clientId: 'aa9ecc1b-ed3a-49fc-987d-68d69ce59c0d',
        userId: new UUID(UUIDVersion),
      };

      const account = new Account(apiClient);

      try {
        await account.init();
        spyOn(account.service.client, 'register').and.callThrough();
        account.service.client.synchronizeClients = () => Promise.resolve();
        account.service.notification.backend.getLastNotification = () => Promise.resolve({id: 'notification-id'});
        account.apiClient.context = {};
        account.apiClient.client.api.postClient = () => Promise.resolve({id: context.clientId});
        await apiClient.initEngine(context);
        storeName = engine.storeName;
        await account.initClient(context);
      } catch (error) {
        return done.fail(error);
      }

      expect(account.service.client.register).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
