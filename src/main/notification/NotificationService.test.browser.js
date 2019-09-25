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
const {NotificationService} = require('@wireapp/core/dist/notification/');
const {IndexedDBEngine} = require('@wireapp/store-engine-dexie');
const {APIClient} = require('@wireapp/api-client');

const UUIDVersion = 4;

describe('NotificationService', () => {
  let storeName = undefined;
  describe('Database "setLastEventDate"', () => {
    afterEach(done => {
      if (storeName) {
        const deleteRequest = window.indexedDB.deleteDatabase(storeName);

        deleteRequest.onerror = done.fail;
        deleteRequest.onsuccess = done;
      }
    });

    it('initializes last event date if database entry is not present', async () => {
      const engine = new IndexedDBEngine();
      const apiClient = new APIClient({
        schemaCallback: db => {
          db.version(1).stores({
            amplify: '',
          });
        },
        store: engine,
        urls: APIClient.BACKEND.STAGING,
      });

      const notificationService = new NotificationService(apiClient);
      spyOn(notificationService.database, 'getLastEventDate').and.callThrough();
      spyOn(engine, 'read').and.callThrough();
      spyOn(engine, 'update').and.callThrough();
      spyOn(engine, 'create').and.callThrough();

      await apiClient.initEngine({userId: new UUID(UUIDVersion)});
      storeName = engine.storeName;

      const returnValue = await notificationService.setLastEventDate(new Date(0));
      expect(returnValue).toEqual(new Date(0));

      expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
      expect(engine.read).toHaveBeenCalledTimes(1);
      expect(engine.update).toHaveBeenCalledTimes(0);
      expect(engine.create).toHaveBeenCalledTimes(1);
    });

    it('updates last event date if lesser database entry exists', async () => {
      const engine = new IndexedDBEngine();
      const apiClient = new APIClient({
        schemaCallback: db => {
          db.version(1).stores({
            amplify: '',
          });
        },
        store: engine,
        urls: APIClient.BACKEND.STAGING,
      });

      const notificationService = new NotificationService(apiClient);

      await apiClient.initEngine({userId: new UUID(UUIDVersion)});
      storeName = engine.storeName;
      await notificationService.setLastEventDate(new Date(0));

      spyOn(notificationService.database, 'getLastEventDate').and.callThrough();
      spyOn(engine, 'read').and.callThrough();
      spyOn(engine, 'update').and.callThrough();
      spyOn(engine, 'create').and.callThrough();

      const newDate = await notificationService.setLastEventDate(new Date(1));
      expect(newDate).toEqual(new Date(1));

      expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
      expect(engine.read).toHaveBeenCalledTimes(1);
      expect(engine.update).toHaveBeenCalledTimes(1);
      expect(engine.create).toHaveBeenCalledTimes(0);
    });
  });

  it('ignores last event date update if greater database entry exists', async () => {
    const engine = new IndexedDBEngine();
    const apiClient = new APIClient({
      schemaCallback: db => {
        db.version(1).stores({
          amplify: '',
        });
      },
      store: engine,
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient);
    const greaterDate = new Date(1);
    const lesserDate = new Date(0);

    await apiClient.initEngine({userId: new UUID(UUIDVersion)});
    storeName = engine.storeName;
    await notificationService.setLastEventDate(greaterDate);

    spyOn(notificationService.database, 'getLastEventDate').and.callThrough();
    spyOn(engine, 'read').and.callThrough();
    spyOn(engine, 'update').and.callThrough();
    spyOn(engine, 'create').and.callThrough();

    const returnValue = await notificationService.setLastEventDate(lesserDate);
    expect(returnValue).toEqual(greaterDate);

    expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
    expect(engine.read).toHaveBeenCalledTimes(1);
    expect(engine.update).toHaveBeenCalledTimes(0);
    expect(engine.create).toHaveBeenCalledTimes(0);
    expect(await notificationService.database.getLastEventDate()).toEqual(greaterDate);
  });

  it('initializes last notification ID if database entry is not present', async () => {
    const engine = new IndexedDBEngine();
    const apiClient = new APIClient({
      schemaCallback: db => {
        db.version(1).stores({
          amplify: '',
        });
      },
      store: engine,
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient);
    spyOn(notificationService.database, 'getLastNotificationId').and.callThrough();
    spyOn(engine, 'read').and.callThrough();
    spyOn(engine, 'update').and.callThrough();
    spyOn(engine, 'create').and.callThrough();

    await apiClient.initEngine({userId: new UUID(UUIDVersion)});
    storeName = engine.storeName;

    const lastNotificationId = await notificationService.setLastNotificationId({id: '12'});
    expect(lastNotificationId).toEqual('12');
  });

  it('updates last notification ID if database entry exists', async () => {
    const engine = new IndexedDBEngine();
    const apiClient = new APIClient({
      schemaCallback: db => {
        db.version(1).stores({
          amplify: '',
        });
      },
      store: engine,
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient);

    await apiClient.initEngine({userId: new UUID(UUIDVersion)});
    storeName = engine.storeName;

    await notificationService.setLastNotificationId({id: '12'});

    spyOn(notificationService.database, 'getLastNotificationId').and.callThrough();
    spyOn(engine, 'read').and.callThrough();
    spyOn(engine, 'update').and.callThrough();
    spyOn(engine, 'create').and.callThrough();

    const returnValue = await notificationService.setLastNotificationId({id: '13'});
    expect(returnValue).toEqual('13');
  });
});
