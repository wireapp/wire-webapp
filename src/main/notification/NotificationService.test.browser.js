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

import {APIClient} from '@wireapp/api-client';
import {NotificationService} from '@wireapp/core/src/main/notification/';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import Dexie from 'dexie';
import UUID from 'uuidjs';

describe('NotificationService', () => {
  let storeName = undefined;
  describe('Database "setLastEventDate"', () => {
    afterEach(done => {
      if (storeName) {
        const deleteRequest = window.indexedDB.deleteDatabase(storeName);
        deleteRequest.onerror = done.fail;
        deleteRequest.onsuccess = done;
      } else {
        done();
      }
    });

    it('initializes last event date if database entry is not present', async () => {
      storeName = UUID.genV4().toString();
      const db = new Dexie(storeName);
      db.version(1).stores({
        amplify: '',
      });
      const engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });

      const notificationService = new NotificationService(apiClient, {}, {}, engine);
      jest.spyOn(notificationService.database, 'getLastEventDate').
      jest.spyOn(engine, 'read').
      jest.spyOn(engine, 'update').
      jest.spyOn(engine, 'create').

      const returnValue = await notificationService.setLastEventDate(new Date(0));
      expect(returnValue).toEqual(new Date(0));

      expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
      expect(engine.read).toHaveBeenCalledTimes(1);
      expect(engine.update).toHaveBeenCalledTimes(0);
      expect(engine.create).toHaveBeenCalledTimes(1);
    });

    it('updates last event date if an older database record exists', async () => {
      storeName = storeName = UUID.genV4().toString();
      const db = new Dexie(storeName);
      db.version(1).stores({
        amplify: '',
      });
      const engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      const apiClient = new APIClient({
        urls: APIClient.BACKEND.STAGING,
      });

      const notificationService = new NotificationService(apiClient, {}, {}, engine);
      await notificationService.setLastEventDate(new Date(0));

      jest.spyOn(notificationService.database, 'getLastEventDate').
      jest.spyOn(engine, 'read').
      jest.spyOn(engine, 'update').
      jest.spyOn(engine, 'create').

      const newDate = await notificationService.setLastEventDate(new Date(1));
      expect(newDate).toEqual(new Date(1));

      expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
      expect(engine.read).toHaveBeenCalledTimes(1);
      expect(engine.update).toHaveBeenCalledTimes(1);
      expect(engine.create).toHaveBeenCalledTimes(0);
    });
  });

  it('ignores last event date update if newer database entry exists', async () => {
    storeName = UUID.genV4().toString();
    const db = new Dexie(storeName);
    db.version(1).stores({
      amplify: '',
    });
    const engine = new IndexedDBEngine();
    await engine.initWithDb(db);

    const apiClient = new APIClient({
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient, {}, {}, engine);
    const greaterDate = new Date(1);
    const lesserDate = new Date(0);

    await notificationService.setLastEventDate(greaterDate);

    jest.spyOn(notificationService.database, 'getLastEventDate').
    jest.spyOn(engine, 'read').
    jest.spyOn(engine, 'update').
    jest.spyOn(engine, 'create').

    const returnValue = await notificationService.setLastEventDate(lesserDate);
    expect(returnValue).toEqual(greaterDate);

    expect(notificationService.database.getLastEventDate).toHaveBeenCalledTimes(1);
    expect(engine.read).toHaveBeenCalledTimes(1);
    expect(engine.update).toHaveBeenCalledTimes(0);
    expect(engine.create).toHaveBeenCalledTimes(0);
    expect(await notificationService.database.getLastEventDate()).toEqual(greaterDate);
  });

  it('initializes last notification ID if database entry is not present', async () => {
    storeName = UUID.genV4().toString();
    const db = new Dexie(storeName);
    db.version(1).stores({
      amplify: '',
    });
    const engine = new IndexedDBEngine();
    await engine.initWithDb(db);

    const apiClient = new APIClient({
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient, {}, {}, engine);
    jest.spyOn(notificationService.database, 'getLastNotificationId').
    jest.spyOn(engine, 'read').
    jest.spyOn(engine, 'update').
    jest.spyOn(engine, 'create').

    const lastNotificationId = await notificationService.setLastNotificationId({id: '12'});
    expect(lastNotificationId).toEqual('12');
  });

  it('updates last notification ID if database entry exists', async () => {
    storeName = UUID.genV4().toString();
    const db = new Dexie(storeName);
    db.version(1).stores({
      amplify: '',
    });
    const engine = new IndexedDBEngine();
    await engine.initWithDb(db);

    const apiClient = new APIClient({
      urls: APIClient.BACKEND.STAGING,
    });

    const notificationService = new NotificationService(apiClient, {}, {}, engine);
    await notificationService.setLastNotificationId({id: '12'});

    jest.spyOn(notificationService.database, 'getLastNotificationId').
    jest.spyOn(engine, 'read').
    jest.spyOn(engine, 'update').
    jest.spyOn(engine, 'create').

    const returnValue = await notificationService.setLastNotificationId({id: '13'});
    expect(returnValue).toEqual('13');
  });
});
