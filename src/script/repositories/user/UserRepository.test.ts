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
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {USER_EVENT, UserUpdateEvent} from '@wireapp/api-client/lib/event';
import type {User as APIClientUser} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {ClientRepository} from 'Repositories/client';
import {ClientMapper} from 'Repositories/client/ClientMapper';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {SelfService} from 'Repositories/self/SelfService';
import {TeamState} from 'Repositories/team/TeamState';
import {entities} from 'test/api/payloads';
import {TestFactory} from 'test/helper/TestFactory';
import {generateAPIUser} from 'test/helper/UserGenerator';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConsentValue} from './ConsentValue';
import {UserRepository} from './UserRepository';
import {UserService} from './UserService';
import {UserState} from './UserState';

import {serverTimeHandler} from '../../time/serverTimeHandler';

const testFactory = new TestFactory();
async function buildUserRepository() {
  const storageRepo = await testFactory.exposeStorageActors();

  const userService = new UserService(storageRepo['storageService']);
  const assetRepository = new AssetRepository();
  const selfService = new SelfService();
  const clientRepository = new ClientRepository({} as any, {} as any);
  const propertyRepository = new PropertiesRepository({} as any, {} as any);
  const userState = new UserState();
  const teamState = new TeamState();

  const userRepository = new UserRepository(
    userService,
    assetRepository,
    selfService,
    clientRepository,
    serverTimeHandler,
    propertyRepository,
    userState,
    teamState,
  );
  return [
    userRepository,
    {
      userService,
      assetRepository,
      selfService,
      clientRepository,
      serverTimeHandler,
      propertyRepository,
      userState,
      teamState,
    },
  ] as const;
}

function createConnections(users: APIClientUser[]) {
  return users.map(user => {
    const connection = new ConnectionEntity();
    connection.userId = user.qualified_id;
    return connection;
  });
}

describe('UserRepository', () => {
  describe('Account preferences', () => {
    describe('Data usage permissions', () => {
      it('syncs the "Send anonymous data" preference through WebSocket events', async () => {
        const [, {propertyRepository}] = await buildUserRepository();
        const setPropertyMock = jest.spyOn(propertyRepository, 'setProperty').mockReturnValue(undefined);
        const turnOnErrorReporting = {
          key: 'webapp',
          type: 'user.properties-set',
          value: {
            settings: {
              privacy: {
                telemetry_data_sharing: true,
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
                telemetry_data_sharing: false,
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

      it('syncs the "Receive newsletter" preference through WebSocket events', async () => {
        const [userRepository, {propertyRepository}] = await buildUserRepository();
        const setPropertyMock = jest.spyOn(propertyRepository, 'setProperty').mockReturnValue(undefined);

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
      it('syncs the "Read receipts" preference through WebSocket events', async () => {
        const [, {propertyRepository}] = await buildUserRepository();
        const setPropertyMock = jest.spyOn(propertyRepository, 'setProperty').mockReturnValue(undefined);

        const deletePropertyMock = jest.spyOn(propertyRepository, 'deleteProperty').mockReturnValue(undefined);

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
      let userRepository: UserRepository;

      beforeEach(async () => {
        [userRepository] = await buildUserRepository();
        user = new User(entities.user.john_doe.id);
        return userRepository['saveUser'](user);
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
      it('saves a user', async () => {
        const [userRepository, {userState}] = await buildUserRepository();
        const user = new User(entities.user.jane_roe.id);

        userRepository['saveUser'](user);

        expect(userState.users().length).toBe(1);
        expect(userState.users()[0]).toBe(user);
      });

      it('saves self user', async () => {
        const [userRepository, {userState}] = await buildUserRepository();
        const user = new User(entities.user.jane_roe.id);

        userRepository['saveUser'](user, true);

        expect(userState.users().length).toBe(1);
        expect(userState.users()[0]).toBe(user);
        expect(userState.self()).toBe(user);
      });
    });

    describe('loadUsers', () => {
      const localUsers = [generateAPIUser(), generateAPIUser(), generateAPIUser()];
      let userRepository: UserRepository;
      let userState: UserState;
      let userService: UserService;

      beforeEach(async () => {
        [userRepository, {userState, userService}] = await buildUserRepository();
        jest.resetAllMocks();
        jest.spyOn(userService, 'loadUsersFromDb').mockResolvedValue(localUsers);
        const selfUser = new User('self');
        selfUser.isMe = true;
        userState.self(selfUser);
        userState.users([selfUser]);
      });

      it('loads all users from backend even when they are already known locally', async () => {
        const newUsers = [generateAPIUser(), generateAPIUser()];
        const users = [...localUsers, ...newUsers];
        const connections = createConnections(users);
        const fetchUserSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue({found: users});

        await userRepository.loadUsers(new User('self'), connections, [], []);

        expect(userState.users()).toHaveLength(users.length + 1);
        expect(fetchUserSpy).toHaveBeenCalledWith(users.map(user => user.qualified_id!));
      });

      it('assigns connections with users', async () => {
        const newUsers = [generateAPIUser(), generateAPIUser()];
        const users = [...localUsers, ...newUsers];
        const connections = createConnections(users);
        jest.spyOn(userService, 'getUsers').mockResolvedValue({found: users});

        await userRepository.loadUsers(new User('self'), connections, [], []);

        expect(userState.users()).toHaveLength(users.length + 1);
        users.forEach(user => {
          const localUser = userState.users().find(u => matchQualifiedIds(u.qualifiedId, user.qualified_id));
          expect(localUser?.connection()?.userId).toEqual(user.qualified_id);
        });
      });

      it('loads users that are partially stored in the DB and maps availability', async () => {
        const userIds = localUsers.map(user => user.qualified_id!);
        const connections = createConnections(localUsers);
        const partialUsers = [
          {
            id: userIds[0].id,
            availability: Availability.Type.AVAILABLE,
            qualified_id: userIds[0],
          },
          {
            id: userIds[1].id,
            availability: Availability.Type.BUSY,
            qualified_id: userIds[1],
          },
        ];

        jest.spyOn(userRepository['userService'], 'loadUsersFromDb').mockResolvedValue(partialUsers as any);
        const fetchUserSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue({found: localUsers});

        await userRepository.loadUsers(new User('self'), connections, [], []);

        expect(userState.users()).toHaveLength(localUsers.length + 1);
        expect(fetchUserSpy).toHaveBeenCalledWith(userIds);

        const userWithAvailability = userState.users().filter(user => user.availability() !== Availability.Type.NONE);
        expect(userWithAvailability).toHaveLength(partialUsers.length);
      });
    });

    describe('assignAllClients', () => {
      it('assigns all available clients to the users', async () => {
        const [userRepository, {clientRepository}] = await buildUserRepository();
        const userJaneRoe = new User(entities.user.jane_roe.id);
        const userJohnDoe = new User(entities.user.john_doe.id);

        userRepository['saveUsers']([userJaneRoe, userJohnDoe]);
        const permanent_client = ClientMapper.mapClient(entities.clients.john_doe.permanent, false);
        const plain_client = ClientMapper.mapClient(entities.clients.jane_roe.plain, false);
        const temporary_client = ClientMapper.mapClient(entities.clients.john_doe.temporary, false);
        const recipients = {
          [entities.user.john_doe.id]: [permanent_client, temporary_client],
          [entities.user.jane_roe.id]: [plain_client],
        };

        jest.spyOn(clientRepository, 'getAllClientsFromDb').mockResolvedValue(recipients);

        return userRepository.assignAllClients().then(() => {
          expect(clientRepository.getAllClientsFromDb).toHaveBeenCalled();
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
        const [userRepository, {userService}] = await buildUserRepository();
        const expectedUsername = 'john_doe';
        const notFoundError = new Error('not found') as any;
        notFoundError.response = {status: HTTP_STATUS.NOT_FOUND};
        jest.spyOn(userService, 'checkUserHandle').mockRejectedValue(notFoundError);

        const actualUsername = await userRepository.verifyUserHandle(expectedUsername);
        expect(actualUsername).toBe(expectedUsername);
      });

      it('rejects when username is taken', async () => {
        const [userRepository, {userService}] = await buildUserRepository();
        const username = 'john_doe';
        jest.spyOn(userService, 'checkUserHandle').mockResolvedValue(undefined);

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
      const [userRepository, {userService, userState}] = await buildUserRepository();
      userState.self(new User());
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
      const [userRepository, {userState}] = await buildUserRepository();
      const user = new User(generateUUID());
      userState.users.push(user);
      userState.self(user);
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

      await userRepository['onUserEvent'](userUpdateEvent, source);

      expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
    });

    it("should emit supportedProtocolsUpdate event after user's supported protocols were updated", async () => {
      const [userRepository, {userState}] = await buildUserRepository();
      const user = new User(generateUUID());
      const selfUser = new User(generateUUID());

      userState.users.push(user);
      userState.self(selfUser);

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

      await userRepository['onUserEvent'](userUpdateEvent, source);

      expect(userRepository.emit).toHaveBeenCalledWith('supportedProtocolsUpdated', {
        user,
        supportedProtocols: newSupportedProtocols,
      });
      expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
    });

    it("should not emit supportedProtocolsUpdate event if user's supported protocols remain unchanged", async () => {
      const [userRepository, {userState}] = await buildUserRepository();
      const user = new User(generateUUID());
      userState.users.push(user);

      const selfUser = new User(generateUUID());
      userState.self(selfUser);

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

      await userRepository['onUserEvent'](userUpdateEvent, source);

      expect(userRepository.emit).not.toHaveBeenCalled();
      expect(user.supportedProtocols()).toEqual(newSupportedProtocols);
    });

    it('should not emit supportedProtocolsUpdate event if the event did not contain supported protocols', async () => {
      const [userRepository, {userState}] = await buildUserRepository();
      const user = new User(generateUUID());
      userState.users.push(user);

      const selfUser = new User(generateUUID());
      userState.self(selfUser);

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

      await userRepository['onUserEvent'](userUpdateEvent, source);

      expect(userRepository.emit).not.toHaveBeenCalled();
      expect(user.supportedProtocols()).toEqual(initialSupportedProtocols);
    });
  });
});
