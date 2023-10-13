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

import {generateUUID} from '@datadog/browser-core';
import {waitFor} from '@testing-library/dom';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {USER_EVENT, UserUpdateEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {entities} from 'test/api/payloads';
import {TestFactory} from 'test/helper/TestFactory';
import {generateAPIUser} from 'test/helper/UserGenerator';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConsentValue} from './ConsentValue';
import {UserRepository} from './UserRepository';
import {UserState} from './UserState';

import {ClientMapper} from '../client/ClientMapper';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {User} from '../entity/User';
import {EventRepository} from '../event/EventRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';

describe('UserRepository', () => {
  const testFactory = new TestFactory();
  let userRepository: UserRepository;
  let userState: UserState;

  beforeAll(async () => {
    userRepository = await testFactory.exposeUserActors();
    userState = userRepository['userState'];
  });

  afterEach(() => {
    userRepository['userState'].users.removeAll();
  });

  describe('Account preferences', () => {
    describe('Data usage permissions', () => {
      it('syncs the "Send anonymous data" preference through WebSocket events', () => {
        const setPropertyMock = jest
          .spyOn(userRepository['propertyRepository'], 'setProperty')
          .mockReturnValue(undefined);
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

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, turnOnErrorReporting, source);

        expect(setPropertyMock).toHaveBeenCalledWith(turnOnErrorReporting.key, turnOnErrorReporting.value);

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, turnOffErrorReporting, source);

        expect(setPropertyMock).toHaveBeenCalledWith(turnOffErrorReporting.key, turnOffErrorReporting.value);
      });

      it('syncs the "Receive newsletter" preference through WebSocket events', () => {
        const setPropertyMock = jest
          .spyOn(userRepository['propertyRepository'], 'setProperty')
          .mockReturnValue(undefined);

        const deletePropertyMock = jest
          .spyOn(userRepository['propertyRepository'], 'deleteProperty')
          .mockReturnValue(undefined);

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

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, giveOnMarketingConsent, source);

        expect(setPropertyMock).toHaveBeenCalledWith(giveOnMarketingConsent.key, giveOnMarketingConsent.value);

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, revokeMarketingConsent, source);

        expect(deletePropertyMock).toHaveBeenCalledWith(revokeMarketingConsent.key);
      });
    });

    describe('Privacy', () => {
      it('syncs the "Read receipts" preference through WebSocket events', () => {
        const setPropertyMock = jest
          .spyOn(userRepository['propertyRepository'], 'setProperty')
          .mockReturnValue(undefined);

        const deletePropertyMock = jest
          .spyOn(userRepository['propertyRepository'], 'deleteProperty')
          .mockReturnValue(undefined);

        const turnOnReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-set',
          value: RECEIPT_MODE.ON,
        };
        const turnOffReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-delete',
        };
        const source = EventRepository.SOURCE.WEB_SOCKET;

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, turnOnReceiptMode, source);

        expect(setPropertyMock).toHaveBeenCalledWith(turnOnReceiptMode.key, turnOnReceiptMode.value);

        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, turnOffReceiptMode, source);

        expect(deletePropertyMock).toHaveBeenCalledWith(turnOffReceiptMode.key);
      });
    });
  });

  describe('User handling', () => {
    describe('findUserById', () => {
      let user: User;

      beforeEach(() => {
        user = new User(entities.user.john_doe.id);
        return userRepository['saveUser'](user);
      });

      afterEach(() => {
        userState.users.removeAll();
      });

      it('should find an existing user', () => {
        const userEntity = userRepository.findUserById({id: user.id, domain: ''});

        expect(userEntity).toEqual(user);
      });

      it('should not find an unknown user', () => {
        const userEntity = userRepository.findUserById({id: '1', domain: ''});

        expect(userEntity).toBe(undefined);
      });
    });

    describe('saveUser', () => {
      it('saves a user', () => {
        const user = new User(entities.user.jane_roe.id);

        userRepository['saveUser'](user);

        expect(userState.users().length).toBe(1);
        expect(userState.users()[0]).toBe(user);
      });

      it('saves self user', () => {
        const user = new User(entities.user.jane_roe.id);

        userRepository['saveUser'](user, true);

        expect(userState.users().length).toBe(1);
        expect(userState.users()[0]).toBe(user);
        expect(userState.self()).toBe(user);
      });
    });

    describe('loadUsers', () => {
      const localUsers = [generateAPIUser(), generateAPIUser(), generateAPIUser()];
      beforeEach(async () => {
        jest.resetAllMocks();
        jest.spyOn(userRepository['userService'], 'loadUserFromDb').mockResolvedValue(localUsers);
        const selfUser = new User('self');
        selfUser.isMe = true;
        userState.users([selfUser]);
      });

      it('loads all users from backend even when they are already known locally', async () => {
        const newUsers = [generateAPIUser(), generateAPIUser()];
        const users = [...localUsers, ...newUsers];
        const userIds = users.map(user => user.qualified_id!);
        const fetchUserSpy = jest.spyOn(userRepository['userService'], 'getUsers').mockResolvedValue({found: users});

        await userRepository.loadUsers(new User('self'), [], [], userIds);

        expect(userState.users()).toHaveLength(users.length + 1);
        expect(fetchUserSpy).toHaveBeenCalledWith(users.map(user => user.qualified_id!));
      });

      it('assigns connections with users', async () => {
        const newUsers = [generateAPIUser(), generateAPIUser()];
        const users = [...localUsers, ...newUsers];
        const userIds = users.map(user => user.qualified_id!);
        jest.spyOn(userRepository['userService'], 'getUsers').mockResolvedValue({found: users});

        const createConnectionWithUser = (userId: QualifiedId) => {
          const connection = new ConnectionEntity();
          connection.userId = userId;
          return connection;
        };

        const connections = users.map(user => createConnectionWithUser(user.qualified_id));

        await userRepository.loadUsers(new User('self'), connections, [], userIds);

        expect(userState.users()).toHaveLength(users.length + 1);
        users.forEach(user => {
          const localUser = userState.users().find(u => matchQualifiedIds(u.qualifiedId, user.qualified_id));
          expect(localUser?.connection().userId).toEqual(user.qualified_id);
        });
      });

      it('loads users that are partially stored in the DB and maps availability', async () => {
        const userIds = localUsers.map(user => user.qualified_id!);
        const partialUsers = [
          {id: userIds[0].id, availability: Availability.Type.AVAILABLE},
          {id: userIds[1].id, availability: Availability.Type.BUSY},
        ];

        jest.spyOn(userRepository['userService'], 'loadUserFromDb').mockResolvedValue(partialUsers as any);
        const fetchUserSpy = jest
          .spyOn(userRepository['userService'], 'getUsers')
          .mockResolvedValue({found: localUsers});

        await userRepository.loadUsers(new User('self'), [], [], userIds);

        expect(userState.users()).toHaveLength(localUsers.length + 1);
        expect(fetchUserSpy).toHaveBeenCalledWith(userIds);

        const userWithAvailability = userState.users().filter(user => user.availability() !== Availability.Type.NONE);
        expect(userWithAvailability).toHaveLength(partialUsers.length);
      });

      it('deletes users that are not needed', async () => {
        const newUsers = [generateAPIUser(), generateAPIUser()];
        const userIds = newUsers.map(user => user.qualified_id!);
        const removeUserSpy = jest.spyOn(userRepository['userService'], 'removeUserFromDb').mockResolvedValue();
        jest.spyOn(userRepository['userService'], 'getUsers').mockResolvedValue({found: newUsers});

        await userRepository.loadUsers(new User(), [], [], userIds);

        expect(userState.users()).toHaveLength(newUsers.length + 1);
        expect(removeUserSpy).toHaveBeenCalledTimes(localUsers.length);
        expect(removeUserSpy).toHaveBeenCalledWith(localUsers[0].qualified_id!);
        expect(removeUserSpy).toHaveBeenCalledWith(localUsers[1].qualified_id!);
        expect(removeUserSpy).toHaveBeenCalledWith(localUsers[2].qualified_id!);
      });
    });

    describe('assignAllClients', () => {
      let userJaneRoe: User;
      let userJohnDoe: User;

      beforeEach(() => {
        userJaneRoe = new User(entities.user.jane_roe.id);
        userJohnDoe = new User(entities.user.john_doe.id);

        userRepository['saveUsers']([userJaneRoe, userJohnDoe]);
        const permanent_client = ClientMapper.mapClient(entities.clients.john_doe.permanent, false);
        const plain_client = ClientMapper.mapClient(entities.clients.jane_roe.plain, false);
        const temporary_client = ClientMapper.mapClient(entities.clients.john_doe.temporary, false);
        const recipients = {
          [entities.user.john_doe.id]: [permanent_client, temporary_client],
          [entities.user.jane_roe.id]: [plain_client],
        };

        spyOn(testFactory.client_repository!, 'getAllClientsFromDb').and.returnValue(Promise.resolve(recipients));
      });

      it('assigns all available clients to the users', () => {
        return userRepository.assignAllClients().then(() => {
          expect(testFactory.client_repository!.getAllClientsFromDb).toHaveBeenCalled();
          expect(userJaneRoe.devices().length).toBe(1);
          expect(userJaneRoe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
          expect(userJohnDoe.devices().length).toBe(2);
          expect(userJohnDoe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
          expect(userJohnDoe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
        });
      });
    });

    describe('verify_username', () => {
      it('resolves with username when username is not taken', async () => {
        const expectedUsername = 'john_doe';
        const notFoundError = new Error('not found') as any;
        notFoundError.response = {status: HTTP_STATUS.NOT_FOUND};

        jest
          .spyOn(userRepository['userService'], 'checkUserHandle')
          .mockImplementation(() => Promise.reject(notFoundError));

        const actualUsername = await userRepository.verifyUserHandle(expectedUsername);
        expect(actualUsername).toBe(expectedUsername);
      });

      it('rejects when username is taken', async () => {
        const username = 'john_doe';

        jest.spyOn(userRepository['userService'], 'checkUserHandle').mockImplementation(() => Promise.resolve());

        await expect(userRepository.verifyUserHandle(username)).rejects.toMatchObject({
          message: 'User related backend request failure',
          name: 'UserError',
          type: 'REQUEST_FAILURE',
        });
      });
    });
  });

  describe('updateUsers', () => {
    it('should update local users', async () => {
      const userService = userRepository['userService'];
      const user = new User(entities.user.jane_roe.id);
      user.name('initial name');
      user.isMe = true;
      userRepository['saveUser'](user);

      jest.spyOn(userService, 'getUsers').mockResolvedValue({found: [entities.user.jane_roe]});

      expect(userRepository.findUserById(user.qualifiedId)?.name()).toBe('initial name');
      await userRepository.refreshUsers([user.qualifiedId]);

      expect(userRepository.findUserById(user.qualifiedId)?.name()).toBe(entities.user.jane_roe.name);
    });
  });

  describe('supportedProtocols', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should update user's supportedProtocols", async () => {
      const user = new User(generateUUID());
      userState.users.push(user);

      const initialSupportedProtocols = [ConversationProtocol.PROTEUS];
      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      user.supportedProtocols(initialSupportedProtocols);

      const userUpdateEvent: UserUpdateEvent = {
        type: USER_EVENT.UPDATE,
        user: {
          supported_protocols: newSupportedProtocols,
          id: user.id,
        },
      };

      const source = EventRepository.SOURCE.WEB_SOCKET;

      amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, userUpdateEvent, source);

      await waitFor(() => {
        expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
      });
    });

    it("should emit supportedProtocolsUpdate event after user's supported protocols were updated", async () => {
      const user = new User(generateUUID());

      userState.users.push(user);

      const initialSupportedProtocols = [ConversationProtocol.PROTEUS];
      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      user.supportedProtocols(initialSupportedProtocols);

      const userUpdateEvent: UserUpdateEvent = {
        type: USER_EVENT.UPDATE,
        user: {
          supported_protocols: newSupportedProtocols,
          id: user.id,
        },
      };

      jest.spyOn(userRepository, 'emit');

      const source = EventRepository.SOURCE.WEB_SOCKET;
      amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, userUpdateEvent, source);

      await waitFor(() => {
        expect(userRepository.emit).toHaveBeenCalledWith('supportedProtocolsUpdated', {
          user,
          supportedProtocols: newSupportedProtocols,
        });
        expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
      });
    });

    it("should not emit supportedProtocolsUpdate event if user's supported protocols remain unchanged", async () => {
      const user = new User(generateUUID());
      userState.users.push(user);

      const initialSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];
      const newSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      user.supportedProtocols(initialSupportedProtocols);

      const userUpdateEvent: UserUpdateEvent = {
        type: USER_EVENT.UPDATE,
        user: {
          supported_protocols: newSupportedProtocols,
          id: user.id,
        },
      };

      jest.spyOn(userRepository, 'emit');

      const source = EventRepository.SOURCE.WEB_SOCKET;
      amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, userUpdateEvent, source);

      await waitFor(() => {
        expect(userRepository.emit).not.toHaveBeenCalled();
        expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
      });
    });

    it('should not emit supportedProtocolsUpdate event if the event did not contain supported protocols', async () => {
      const user = new User(generateUUID());
      userState.users.push(user);

      const initialSupportedProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      user.supportedProtocols(initialSupportedProtocols);

      const userUpdateEvent: UserUpdateEvent = {
        type: USER_EVENT.UPDATE,
        user: {
          id: user.id,
        },
      };

      jest.spyOn(userRepository, 'emit');

      const source = EventRepository.SOURCE.WEB_SOCKET;
      amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, userUpdateEvent, source);

      await waitFor(() => {
        expect(userRepository.emit).not.toHaveBeenCalled();
        expect(user.supportedProtocols()).toEqual(initialSupportedProtocols);
      });
    });
  });
});
