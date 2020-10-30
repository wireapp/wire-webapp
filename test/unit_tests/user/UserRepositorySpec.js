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

import {Confirmation} from '@wireapp/protocol-messaging';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {ConsentValue} from 'src/script/user/ConsentValue';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {User} from 'src/script/entity/User';
import {EventRepository} from 'src/script/event/EventRepository';
import {ClientMapper} from 'src/script/client/ClientMapper';
import {Config} from 'src/script/Config';
import {TestFactory} from '../../helper/TestFactory';

describe('UserRepository', () => {
  let server = null;
  const testFactory = new TestFactory();

  beforeAll(() => testFactory.exposeUserActors());

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    testFactory.user_repository.userState.users.removeAll();
    server.restore();
  });

  describe('Account preferences ', () => {
    beforeEach(() => {
      spyOn(testFactory.user_repository.propertyRepository, 'publishProperties').and.callFake(properties => {
        return properties;
      });
    });

    describe('Data usage permissions', () => {
      it('syncs the "Send anonymous data" preference through WebSocket events', () => {
        const turnOnErrorReporting = {
          key: 'webapp',
          type: 'user.properties-set',
          value: {
            settings: {
              privacy: {
                improve_wire: true,
              },
            },
            version: 1,
          },
        };

        const turnOffErrorReporting = {
          key: 'webapp',
          type: 'user.properties-set',
          value: {
            settings: {
              privacy: {
                improve_wire: false,
              },
            },
            version: 1,
          },
        };

        const source = EventRepository.SOURCE.WEB_SOCKET;
        const errorReporting = () =>
          testFactory.user_repository.propertyRepository.properties.settings.privacy.improve_wire;

        expect(errorReporting()).toBeUndefined();

        testFactory.user_repository.onUserEvent(turnOnErrorReporting, source);

        expect(errorReporting()).toBe(true);

        testFactory.user_repository.onUserEvent(turnOffErrorReporting, source);

        expect(errorReporting()).toBe(false);
      });

      it('syncs the "Receive newsletter" preference through WebSocket events', () => {
        const giveOnMarketingConsent = {
          key: PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
          type: 'user.properties-set',
          value: ConsentValue.GIVEN,
        };
        const revokeMarketingConsent = {
          key: PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
          type: 'user.properties-delete',
        };

        const source = EventRepository.SOURCE.WEB_SOCKET;
        const marketingConsent = testFactory.user_repository.propertyRepository.marketingConsent;

        expect(marketingConsent()).toBe(ConsentValue.NOT_GIVEN);

        testFactory.user_repository.onUserEvent(giveOnMarketingConsent, source);

        expect(marketingConsent()).toBe(ConsentValue.GIVEN);

        testFactory.user_repository.onUserEvent(revokeMarketingConsent, source);

        expect(marketingConsent()).toBe(ConsentValue.NOT_GIVEN);
      });
    });

    describe('Privacy', () => {
      it('syncs the "Read receipts" preference through WebSocket events', () => {
        const turnOnReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-set',
          value: Confirmation.Type.READ,
        };
        const turnOffReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-delete',
        };
        const source = EventRepository.SOURCE.WEB_SOCKET;
        const receiptMode = testFactory.user_repository.propertyRepository.receiptMode;

        expect(receiptMode()).toBe(Confirmation.Type.DELIVERED);

        testFactory.user_repository.onUserEvent(turnOnReceiptMode, source);

        expect(receiptMode()).toBe(Confirmation.Type.READ);

        testFactory.user_repository.onUserEvent(turnOffReceiptMode, source);

        expect(receiptMode()).toBe(Confirmation.Type.DELIVERED);
      });
    });
  });

  describe('User handling', () => {
    describe('fetchUsersById', () => {
      it('should handle malformed input', () => {
        return testFactory.user_repository
          .fetchUsersById()
          .then(response => {
            expect(response.length).toBe(0);
            return testFactory.user_repository.fetchUsersById([undefined, undefined, undefined]);
          })
          .then(response => {
            expect(response.length).toBe(0);
          });
      });
    });

    describe('findUserById', () => {
      let user = null;

      beforeEach(() => {
        user = new User(entities.user.john_doe.id);
        return testFactory.user_repository.saveUser(user);
      });

      afterEach(() => {
        testFactory.user_repository.userState.users.removeAll();
      });

      it('should find an existing user', () => {
        const userEntity = testFactory.user_repository.findUserById(user.id);

        expect(userEntity).toEqual(user);
      });

      it('should not find an unknown user', () => {
        const userEntity = testFactory.user_repository.findUserById('1');

        expect(userEntity).toBe(undefined);
      });
    });

    describe('saveUser', () => {
      afterEach(() => testFactory.user_repository.userState.users.removeAll());

      it('saves a user', () => {
        const user = new User();
        user.id = entities.user.jane_roe.id;

        testFactory.user_repository.saveUser(user);

        expect(testFactory.user_repository.userState.users().length).toBe(1);
        expect(testFactory.user_repository.userState.users()[0]).toBe(user);
      });

      it('saves self user', () => {
        const user = new User();
        user.id = entities.user.jane_roe.id;

        testFactory.user_repository.saveUser(user, true);

        expect(testFactory.user_repository.userState.users().length).toBe(1);
        expect(testFactory.user_repository.userState.users()[0]).toBe(user);
        expect(testFactory.user_repository.userState.self()).toBe(user);
      });
    });

    describe('ssignAllClients', () => {
      let userJaneRoe = null;
      let userJohnDoe = null;

      beforeEach(() => {
        testFactory.user_repository.userState.users.removeAll();
        userJaneRoe = new User(entities.user.jane_roe.id);
        userJohnDoe = new User(entities.user.john_doe.id);

        testFactory.user_repository.saveUsers([userJaneRoe, userJohnDoe]);
        const permanent_client = ClientMapper.mapClient(entities.clients.john_doe.permanent);
        const plain_client = ClientMapper.mapClient(entities.clients.jane_roe.plain);
        const temporary_client = ClientMapper.mapClient(entities.clients.john_doe.temporary);
        const recipients = {
          [entities.user.john_doe.id]: [permanent_client, temporary_client],
          [entities.user.jane_roe.id]: [plain_client],
        };

        spyOn(testFactory.client_repository, 'getAllClientsFromDb').and.returnValue(Promise.resolve(recipients));
      });

      afterEach(() => testFactory.user_repository.userState.users.removeAll());

      it('assigns all available clients to the users', () => {
        return testFactory.user_repository.assignAllClients().then(() => {
          expect(testFactory.client_repository.getAllClientsFromDb).toHaveBeenCalled();
          expect(userJaneRoe.devices().length).toBe(1);
          expect(userJaneRoe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
          expect(userJohnDoe.devices().length).toBe(2);
          expect(userJohnDoe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
          expect(userJohnDoe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
        });
      });
    });

    describe('verifyUsernames', () => {
      it('resolves with username when username is not taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${Config.getConfig().BACKEND_REST}/users/handles`, [
          HTTP_STATUS.OK,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames),
        ]);

        return testFactory.user_repository.verifyUsernames(usernames).then(_usernames => {
          expect(_usernames).toEqual(usernames);
        });
      });

      it('rejects when username is taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${Config.getConfig().BACKEND_REST}/users/handles`, [
          HTTP_STATUS.OK,
          {'Content-Type': 'application/json'},
          JSON.stringify([]),
        ]);

        return testFactory.user_repository.verifyUsernames(usernames).then(_usernames => {
          expect(_usernames.length).toBe(0);
        });
      });
    });

    describe('verify_username', () => {
      it('resolves with username when username is not taken', () => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${Config.getConfig().BACKEND_REST}/users/handles/${username}`, [
          HTTP_STATUS.NOT_FOUND,
          {},
          '',
        ]);

        return testFactory.user_repository.verifyUsername(username).then(_username => {
          expect(_username).toBe(username);
        });
      });

      it('rejects when username is taken', done => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${Config.getConfig().BACKEND_REST}/users/handles/${username}`, [
          HTTP_STATUS.OK,
          {},
          '',
        ]);

        testFactory.user_repository
          .verifyUsername(username)
          .then(done.fail)
          .catch(() => done());
      });
    });
  });
});
