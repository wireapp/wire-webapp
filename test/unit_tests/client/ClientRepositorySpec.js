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

import {ClientType} from '@wireapp/api-client/src/client/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {User} from 'src/script/entity/User';

import {ClientRepository} from 'src/script/client/ClientRepository';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {ClientMapper} from 'src/script/client/ClientMapper';
import {ClientError} from 'src/script/error/ClientError';
import {TestFactory} from '../../helper/TestFactory';
import {Runtime} from '@wireapp/commons';

describe('ClientRepository', () => {
  const testFactory = new TestFactory();
  const clientId = '5021d77752286cac';
  let userId = undefined;

  beforeAll(() => {
    return testFactory.exposeClientActors().then(() => {
      userId = testFactory.client_repository.selfUser().id;
    });
  });

  beforeEach(() => testFactory.storage_repository.clearStores());

  describe('getClientsByUserId', () =>
    it('maps client entities from client payloads by the backend', () => {
      const client = new ClientEntity();
      client.id = clientId;

      testFactory.client_repository['clientState'].currentClient(client);

      const allClients = [
        {class: 'desktop', id: '706f64373b1bcf79'},
        {class: 'phone', id: '809fd276d6709474'},
        {class: 'desktop', id: '8e11e06549c8cf1a'},
        {class: 'tablet', id: 'c411f97b139c818b'},
        {class: 'desktop', id: 'cbf3ea49214702d8'},
      ];
      spyOn(testFactory.client_repository.clientService, 'getClientsByUserId').and.returnValue(
        Promise.resolve(allClients),
      );

      return testFactory.client_repository.getClientsByUserId(entities.user.john_doe.id).then(clientEntities => {
        expect(clientEntities.length).toBe(allClients.length);
      });
    }));

  describe('getValidLocalClient', () => {
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

    const clientPayloadDatabase = {
      ...clientPayloadServer,
      meta: {
        is_verified: true,
        primary_key: 'local_identity',
      },
    };

    it('resolves with a valid client', () => {
      const clientService = testFactory.client_repository.clientService;

      spyOn(clientService, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));
      spyOn(clientService, 'getClientById').and.returnValue(Promise.resolve(clientPayloadServer));

      return testFactory.client_repository.getValidLocalClient().then(clientObservable => {
        expect(clientObservable).toBeDefined();
        expect(clientObservable().id).toBe(clientId);
      });
    });

    it('rejects with an error if no client found locally', () => {
      const clientService = testFactory.client_repository.clientService;
      spyOn(clientService, 'loadClientFromDb').and.returnValue(
        Promise.resolve(ClientRepository.PRIMARY_KEY_CURRENT_CLIENT),
      );
      const backendError = new Error();
      backendError.code = HTTP_STATUS.NOT_FOUND;
      spyOn(clientService, 'getClientById').and.returnValue(Promise.reject(backendError));

      return testFactory.client_repository
        .getValidLocalClient()
        .then(fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(ClientError));
          expect(error.type).toBe(ClientError.TYPE.NO_VALID_CLIENT);
        });
    });

    it('rejects with an error if client removed on backend', () => {
      const clientService = testFactory.client_repository.clientService;
      spyOn(clientService, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));
      spyOn(testFactory.storage_service, 'deleteDatabase').and.returnValue(Promise.resolve(true));
      const backendError = new Error();
      backendError.response = {status: HTTP_STATUS.NOT_FOUND};
      spyOn(clientService, 'getClientById').and.returnValue(Promise.reject(backendError));

      return testFactory.client_repository
        .getValidLocalClient()
        .then(fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(ClientError));
          expect(error.type).toBe(ClientError.TYPE.NO_VALID_CLIENT);
        });
    });

    it('rejects with an error if something else fails', done => {
      spyOn(testFactory.client_repository.clientService, 'loadClientFromDb').and.returnValue(
        Promise.reject(new Error('Expected unit test error')),
      );

      testFactory.client_repository
        .getValidLocalClient()
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(Error));
          expect(error.type).toBe(ClientError.TYPE.DATABASE_FAILURE);
          done();
        });
    });
  });

  describe('constructPrimaryKey', () => {
    it('returns a proper primary key for a client', () => {
      const actualPrimaryKey = testFactory.client_repository.constructPrimaryKey(userId, clientId);
      const expectedPrimaryKey = `${userId}@${clientId}`;

      expect(actualPrimaryKey).toEqual(expectedPrimaryKey);
    });

    it('throws an error if missing user ID', () => {
      const functionCall = () => testFactory.client_repository.constructPrimaryKey(undefined, clientId);

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.NO_USER_ID);
    });

    it('throws an error if missing client ID', () => {
      const functionCall = () => testFactory.client_repository.constructPrimaryKey(userId, undefined);

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.NO_CLIENT_ID);
    });
  });

  describe('isCurrentClientPermanent', () => {
    beforeEach(() => {
      jasmine.getEnv().allowRespy(true);
      spyOn(Runtime, 'isDesktopApp').and.returnValue(false);
      testFactory.client_repository['clientState'].currentClient(undefined);
    });

    it('returns true on Electron', () => {
      const clientPayload = {type: ClientType.PERMANENT};
      const clientEntity = ClientMapper.mapClient(clientPayload, true);
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns true on Electron even if client is temporary', () => {
      const clientPayload = {type: ClientType.TEMPORARY};
      const clientEntity = ClientMapper.mapClient(clientPayload, true);
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('throws an error on Electron if no current client', () => {
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const functionCall = () => testFactory.client_repository.isCurrentClientPermanent();

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.CLIENT_NOT_SET);
    });

    it('returns true if current client is permanent', () => {
      const clientPayload = {type: ClientType.PERMANENT};
      const clientEntity = ClientMapper.mapClient(clientPayload, true);
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns false if current client is temporary', () => {
      const clientPayload = {type: ClientType.TEMPORARY};
      const clientEntity = ClientMapper.mapClient(clientPayload, true);
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeFalsy();
    });

    it('throws an error if no current client', () => {
      const functionCall = () => testFactory.client_repository.isCurrentClientPermanent();

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.CLIENT_NOT_SET);
    });
  });

  describe('isCurrentClient', () => {
    beforeEach(() => testFactory.client_repository['clientState'].currentClient(undefined));

    it('returns true if user ID and client ID match', () => {
      const clientEntity = new ClientEntity();
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      testFactory.client_repository.selfUser(new User(userId));
      const result = testFactory.client_repository.isCurrentClient(userId, clientId);

      expect(result).toBeTruthy();
    });

    it('returns false if only the user ID matches', () => {
      const clientEntity = new ClientEntity();
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      const result = testFactory.client_repository.isCurrentClient(userId, 'ABCDE');

      expect(result).toBeFalsy();
    });

    it('returns false if only the client ID matches', () => {
      const clientEntity = new ClientEntity();
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient(clientEntity);
      const result = testFactory.client_repository.isCurrentClient('ABCDE', clientId);

      expect(result).toBeFalsy();
    });

    it('throws an error if current client is not set', () => {
      const functionCall = () => testFactory.client_repository.isCurrentClient(userId, clientId);

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.CLIENT_NOT_SET);
    });

    it('throws an error if client ID is not specified', () => {
      testFactory.client_repository['clientState'].currentClient(new ClientEntity());
      const functionCall = () => testFactory.client_repository.isCurrentClient(userId);

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.NO_CLIENT_ID);
    });

    it('throws an error if user ID is not specified', () => {
      testFactory.client_repository['clientState'].currentClient(new ClientEntity());
      const functionCall = () => testFactory.client_repository.isCurrentClient(undefined, clientId);

      expect(functionCall).toThrowError(ClientError, ClientError.MESSAGE.NO_USER_ID);
    });
  });
});
