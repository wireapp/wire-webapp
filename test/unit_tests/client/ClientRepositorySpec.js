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

// grunt test_init && grunt test_run:client/ClientRepository

'use strict';

describe('z.client.ClientRepository', () => {
  const testFactory = new TestFactory();
  const clientId = '5021d77752286cac';
  let userId = undefined;

  beforeAll(done => {
    testFactory
      .exposeClientActors()
      .then(() => {
        userId = TestFactory.client_repository.selfUser().id;
        done();
      })
      .catch(done.fail);
  });

  beforeEach(done => {
    TestFactory.storage_repository
      .clearStores()
      .then(done)
      .catch(done.fail);
  });

  describe('getClientsByUserId', () =>
    it('maps client entities from client payloads by the backend', done => {
      TestFactory.client_repository.currentClient(new z.client.ClientEntity({id: clientId}));
      spyOn(TestFactory.client_service, 'getClientsByUserId').and.returnValue(
        Promise.resolve([
          {class: 'desktop', id: '706f64373b1bcf79'},
          {class: 'phone', id: '809fd276d6709474'},
          {class: 'desktop', id: '8e11e06549c8cf1a'},
          {class: 'tablet', id: 'c411f97b139c818b'},
          {class: 'desktop', id: 'cbf3ea49214702d8'},
        ])
      );

      TestFactory.client_repository
        .getClientsByUserId(entities.user.john_doe.id)
        .then(clientEntities => {
          const [firstClientEntity] = clientEntities;
          expect(firstClientEntity instanceof z.client.ClientEntity).toBeTruthy();
          expect(Object.keys(clientEntities).length).toBe(5);
          done();
        })
        .catch(done.fail);
    }));

  describe('getValidLocalClient', () => {
    let server = undefined;

    const clientUrl = `${testFactory.settings.connection.restUrl}/clients/${clientId}`;
    const clientPayloadServer = {
      address: '62.96.148.44',
      class: 'desktop',
      id: clientId,
      label: 'Windows 10',
      location: {
        lat: 52.5233,
        lon: 13.4138,
      },
      model: 'Wire for Windows',
      time: '2016-05-02T11:53:49.976Z',
      type: 'permanent',
    };

    const clientPayloadDatabase = clientPayloadServer;
    clientPayloadDatabase.meta = {
      is_verified: true,
      primary_key: 'local_identity',
    };

    beforeEach(() => {
      server = sinon.fakeServer.create();
      server.autoRespond = true;
    });

    afterEach(() => {
      server.restore();
    });

    it('resolves with a valid client', done => {
      spyOn(TestFactory.client_service, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));

      server.respondWith('GET', clientUrl, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(clientPayloadServer),
      ]);

      TestFactory.client_repository
        .getValidLocalClient()
        .then(clientObservable => {
          expect(clientObservable).toBeDefined();
          expect(clientObservable().id).toBe(clientId);
          done();
        })
        .catch(done.fail);
    });

    it('rejects with an error if no client found locally', done => {
      spyOn(TestFactory.client_service, 'loadClientFromDb').and.returnValue(
        Promise.resolve(z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT)
      );

      TestFactory.client_repository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.client.ClientError));
          expect(error.type).toBe(z.client.ClientError.TYPE.NO_VALID_CLIENT);
          done();
        });
    });

    it('rejects with an error if client removed on backend', done => {
      spyOn(TestFactory.client_service, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));
      spyOn(TestFactory.storage_service, 'deleteDatabase').and.returnValue(Promise.resolve(true));

      TestFactory.client_repository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.client.ClientError));
          expect(error.type).toBe(z.client.ClientError.TYPE.NO_VALID_CLIENT);
          done();
        });
    });

    it('rejects with an error if something else fails', done => {
      spyOn(TestFactory.client_service, 'loadClientFromDb').and.returnValue(
        Promise.reject(new Error('Expected unit test error'))
      );

      TestFactory.client_repository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(Error));
          expect(error.type).toBe(z.client.ClientError.TYPE.DATABASE_FAILURE);
          done();
        });
    });
  });

  describe('_constructPrimaryKey', () => {
    it('returns a proper primary key for a client', () => {
      const actualPrimaryKey = TestFactory.client_repository._constructPrimaryKey(userId, clientId);
      const expectedPrimaryKey = `${userId}@${clientId}`;
      return expect(actualPrimaryKey).toEqual(expectedPrimaryKey);
    });

    it('throws an error if missing user ID', () => {
      const functionCall = () => TestFactory.client_repository._constructPrimaryKey(undefined, clientId);
      return expect(functionCall).toThrowError(z.client.ClientError, 'User ID is not defined');
    });

    return it('throws and error if missing client ID', () => {
      const functionCall = () => TestFactory.client_repository._constructPrimaryKey(userId, undefined);
      return expect(functionCall).toThrowError(z.client.ClientError, 'Client ID is not defined');
    });
  });

  describe('isCurrentClientPermanent', () => {
    beforeEach(() => {
      z.util.Environment.electron = false;
      TestFactory.client_repository.currentClient(undefined);
    });

    it('returns true on Electron', () => {
      const clientPayload = {type: z.client.ClientType.PERMANENT};
      const clientEntity = TestFactory.client_repository.clientMapper.mapClient(clientPayload, true);
      TestFactory.client_repository.currentClient(clientEntity);
      z.util.Environment.electron = true;
      const isPermanent = TestFactory.client_repository.isCurrentClientPermanent();
      expect(isPermanent).toBeTruthy();
    });

    it('returns true on Electron even if client is temporary', () => {
      const clientPayload = {type: z.client.ClientType.TEMPORARY};
      const clientEntity = TestFactory.client_repository.clientMapper.mapClient(clientPayload, true);
      TestFactory.client_repository.currentClient(clientEntity);
      z.util.Environment.electron = true;
      const isPermanent = TestFactory.client_repository.isCurrentClientPermanent();
      expect(isPermanent).toBeTruthy();
    });

    it('throws an error on Electron if no current client', () => {
      z.util.Environment.electron = true;
      const functionCall = () => TestFactory.client_repository.isCurrentClientPermanent();
      expect(functionCall).toThrowError(z.client.ClientError, 'Local client is not yet set');
    });

    it('returns true if current client is permanent', () => {
      const clientPayload = {type: z.client.ClientType.PERMANENT};
      const clientEntity = TestFactory.client_repository.clientMapper.mapClient(clientPayload, true);
      TestFactory.client_repository.currentClient(clientEntity);
      const isPermanent = TestFactory.client_repository.isCurrentClientPermanent();
      expect(isPermanent).toBeTruthy();
    });

    it('returns false if current client is temporary', () => {
      const clientPayload = {type: z.client.ClientType.TEMPORARY};
      const clientEntity = TestFactory.client_repository.clientMapper.mapClient(clientPayload, true);
      TestFactory.client_repository.currentClient(clientEntity);
      const isPermanent = TestFactory.client_repository.isCurrentClientPermanent();
      expect(isPermanent).toBeFalsy();
    });

    it('throws an error if no current client', () => {
      const functionCall = () => TestFactory.client_repository.isCurrentClientPermanent();
      expect(functionCall).toThrowError(z.client.ClientError, 'Local client is not yet set');
    });
  });

  describe('_isCurrentClient', () => {
    beforeEach(() => {
      TestFactory.client_repository.currentClient(undefined);
    });

    it('returns true if user ID and client ID match', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      TestFactory.client_repository.currentClient(clientEntity);
      TestFactory.client_repository.selfUser(new z.entity.User(userId));
      const result = TestFactory.client_repository._isCurrentClient(userId, clientId);
      expect(result).toBeTruthy();
    });

    it('returns false if only the user ID matches', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      TestFactory.client_repository.currentClient(clientEntity);
      const result = TestFactory.client_repository._isCurrentClient(userId, 'ABCDE');
      expect(result).toBeFalsy();
    });

    it('returns false if only the client ID matches', () => {
      const clientEntity = new z.client.ClientEntity();
      clientEntity.id = clientId;
      TestFactory.client_repository.currentClient(clientEntity);
      const result = TestFactory.client_repository._isCurrentClient('ABCDE', clientId);
      expect(result).toBeFalsy();
    });

    it('throws an error if current client is not set', () => {
      const functionCall = () => TestFactory.client_repository._isCurrentClient(userId, clientId);
      expect(functionCall).toThrowError(z.client.ClientError, 'Local client is not yet set');
    });

    it('throws an error if client ID is not specified', () => {
      TestFactory.client_repository.currentClient(new z.client.ClientEntity());
      const functionCall = () => TestFactory.client_repository._isCurrentClient(userId);
      expect(functionCall).toThrowError(z.client.ClientError, 'Client ID is not defined');
    });

    it('throws an error if user ID is not specified', () => {
      TestFactory.client_repository.currentClient(new z.client.ClientEntity());
      const functionCall = () => TestFactory.client_repository._isCurrentClient(undefined, clientId);
      expect(functionCall).toThrowError(z.client.ClientError, 'User ID is not defined');
    });
  });
});
