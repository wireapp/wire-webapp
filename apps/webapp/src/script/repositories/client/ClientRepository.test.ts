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

import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Runtime} from '@wireapp/commons';

import {User} from 'Repositories/entity/User';
import {ClientRecord} from 'Repositories/storage/record/ClientRecord';
import {ClientError} from 'src/script/error/ClientError';

import {ClientRepository, ClientMapper, ClientEntity} from './.';

import {entities} from '../../../../test/api/payloads';
import {TestFactory} from '../../../../test/helper/TestFactory';

describe('ClientRepository', () => {
  const testFactory = new TestFactory();
  const clientId = '5021d77752286cac';
  let userId: string = undefined;

  beforeAll(async () => {
    await testFactory.exposeClientActors();

    const user = new User(entities.user.john_doe.id, null);
    user.email(entities.user.john_doe.email);
    user.isMe = true;
    user.locale = entities.user.john_doe.locale;
    user.name(entities.user.john_doe.name);

    testFactory.client_repository?.init(user);
    userId = testFactory.client_repository.selfUser().id;
  });

  beforeEach(() => testFactory.storage_repository.clearStores());

  describe('getClientsByUserIds', () => {
    it('maps client entities from client payloads by the backend', async () => {
      const client = new ClientEntity(false, null);
      client.id = clientId;

      testFactory.client_repository['clientState'].currentClient = client;

      const clients = [
        {class: ClientClassification.DESKTOP, id: '706f64373b1bcf79'},
        {class: ClientClassification.PHONE, id: '809fd276d6709474'},
        {class: ClientClassification.DESKTOP, id: '8e11e06549c8cf1a'},
        {class: ClientClassification.TABLET, id: 'c411f97b139c818b'},
        {class: ClientClassification.DESKTOP, id: 'cbf3ea49214702d8'},
      ];
      const apiResponse = {
        '': {[entities.user.john_doe.id]: clients},
      };

      spyOn(testFactory.client_repository.clientService, 'getClientsByUserIds').and.callFake(() =>
        Promise.resolve(apiResponse),
      );

      const clientEntities = await testFactory.client_repository.getClientsByUserIds(
        [entities.user.john_doe.qualified_id],
        false,
      );
      expect(clientEntities[''][entities.user.john_doe.id].length).toBe(clients.length);
    });
  });

  describe('getValidLocalClient', () => {
    const clientPayloadServer = {
      address: '62.96.148.44',
      class: ClientClassification.DESKTOP,
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
        is_mls_verified: true,
        primary_key: 'local_identity',
      },
    };

    it('resolves with a valid client', () => {
      const clientService = testFactory.client_repository.clientService;

      spyOn(clientService, 'loadClientFromDb').and.returnValue(Promise.resolve(clientPayloadDatabase));
      spyOn(clientService, 'getClientById').and.returnValue(Promise.resolve(clientPayloadServer));

      return testFactory.client_repository.getValidLocalClient().then(client => {
        expect(client).toBeDefined();
        expect(client.id).toBe(clientId);
      });
    });

    it('rejects with an error if no client found locally', () => {
      const clientService = testFactory.client_repository.clientService;
      spyOn(clientService, 'loadClientFromDb').and.returnValue(
        Promise.resolve(ClientRepository.PRIMARY_KEY_CURRENT_CLIENT),
      );
      const backendError: Error & {code?: HTTP_STATUS} = new Error('not found locally');
      backendError.code = HTTP_STATUS.NOT_FOUND;
      spyOn(clientService, 'getClientById').and.callFake(() => Promise.reject(backendError));

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
      const backendError: Error & {response?: {status: HTTP_STATUS}} = new Error('not found on backend');
      backendError.response = {status: HTTP_STATUS.NOT_FOUND};
      spyOn(clientService, 'getClientById').and.callFake(() => Promise.reject(backendError));

      return testFactory.client_repository
        .getValidLocalClient()
        .then(fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(ClientError));
          expect(error.type).toBe(ClientError.TYPE.NO_VALID_CLIENT);
        });
    });

    it('rejects with an error if something else fails', async () => {
      spyOn(testFactory.client_repository.clientService, 'loadClientFromDb').and.returnValue(
        Promise.reject(new Error('Expected unit test error')),
      );

      await expect(testFactory.client_repository.getValidLocalClient()).rejects.toMatchObject({
        type: ClientError.TYPE.DATABASE_FAILURE,
      });
    });
  });

  describe('isCurrentClientPermanent', () => {
    beforeEach(() => {
      (jasmine as any).getEnv().allowRespy(true);
      spyOn(Runtime, 'isDesktopApp').and.returnValue(false);
      testFactory.client_repository['clientState'].currentClient = undefined;
    });

    it('returns true on Electron', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.DESKTOP,
        id: clientId,
        meta: {},
        type: ClientType.PERMANENT,
      };
      const clientEntity = ClientMapper.mapClient(clientPayload, true, null);
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns true on Electron even if client is temporary', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.DESKTOP,
        id: clientId,
        meta: {},
        type: ClientType.TEMPORARY,
      };
      const clientEntity = ClientMapper.mapClient(clientPayload, true, null);
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('throws an error on Electron if no current client', () => {
      spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      const functionCall = () => testFactory.client_repository.isCurrentClientPermanent();

      expect(functionCall).toThrow(ClientError);
    });

    it('returns true if current client is permanent', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.PHONE,
        id: clientId,
        meta: {},
        type: ClientType.PERMANENT,
      };
      const clientEntity = ClientMapper.mapClient(clientPayload, true, null);
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeTruthy();
    });

    it('returns false if current client is temporary', () => {
      const clientPayload: ClientRecord = {
        class: ClientClassification.PHONE,
        id: clientId,
        meta: {},
        type: ClientType.TEMPORARY,
      };
      const clientEntity = ClientMapper.mapClient(clientPayload, true, null);
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      const isPermanent = testFactory.client_repository.isCurrentClientPermanent();

      expect(isPermanent).toBeFalsy();
    });

    it('throws an error if no current client', () => {
      const functionCall = () => testFactory.client_repository.isCurrentClientPermanent();

      expect(functionCall).toThrow(ClientError);
    });
  });

  describe('isCurrentClient', () => {
    //@ts-ignore
    beforeEach(() => (testFactory.client_repository['clientState'].currentClient = undefined));

    it('returns true if user ID and client ID match', () => {
      const clientEntity = new ClientEntity(false, null);
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      testFactory.client_repository.selfUser(new User(userId, null));
      const result = testFactory.client_repository['isCurrentClient']({domain: '', id: userId}, clientId);

      expect(result).toBeTruthy();
    });

    it('returns false if only the user ID matches', () => {
      const clientEntity = new ClientEntity(false, null);
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      const result = testFactory.client_repository['isCurrentClient']({domain: '', id: userId}, 'ABCDE');

      expect(result).toBeFalsy();
    });

    it('returns false if only the client ID matches', () => {
      const clientEntity = new ClientEntity(false, null);
      clientEntity.id = clientId;
      testFactory.client_repository['clientState'].currentClient = clientEntity;
      const result = testFactory.client_repository['isCurrentClient']({domain: '', id: 'ABCDE'}, clientId);

      expect(result).toBeFalsy();
    });

    it('throws an error if current client is not set', () => {
      const functionCall = () => testFactory.client_repository['isCurrentClient']({domain: '', id: userId}, clientId);

      expect(functionCall).toThrow(ClientError);
    });

    it('throws an error if client ID is not specified', () => {
      testFactory.client_repository['clientState'].currentClient = new ClientEntity(false, null);
      const functionCall = () => testFactory.client_repository['isCurrentClient']({domain: '', id: userId}, undefined);

      expect(functionCall).toThrow(ClientError);
    });

    it('throws an error if user ID is not specified', () => {
      testFactory.client_repository['clientState'].currentClient = new ClientEntity(false, null);
      const functionCall = () => testFactory.client_repository['isCurrentClient'](undefined, clientId);

      expect(functionCall).toThrow(ClientError);
    });
  });
});
