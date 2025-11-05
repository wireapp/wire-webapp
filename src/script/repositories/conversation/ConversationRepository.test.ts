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

import {faker} from '@faker-js/faker';
import {waitFor} from '@testing-library/react';
import {ClientClassification} from '@wireapp/api-client/lib/client/';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {
  Conversation as BackendConversation,
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
  RemoteConversations,
  MLSConversation as BackendMLSConversation,
  CONVERSATION_CELLS_STATE,
} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {
  ConversationProtocolUpdateEvent,
  ConversationCreateEvent,
  ConversationMemberJoinEvent,
  CONVERSATION_EVENT,
  ConversationMLSWelcomeEvent,
} from '@wireapp/api-client/lib/event/';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {ClientMLSError, ClientMLSErrorLabel} from '@wireapp/core/lib/messagingProtocols/mls';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import ko from 'knockout';
import sinon from 'sinon';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {Message} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {ClientEvent, CONVERSATION} from 'Repositories/event/Client';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventService} from 'Repositories/event/EventService';
import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {LegacyEventRecord, StorageService} from 'Repositories/storage';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {Config} from 'src/script/Config';
import {ConversationError} from 'src/script/error/ConversationError';
import {
  generateConversation as _generateConversation,
  generateAPIConversation,
} from 'test/helper/ConversationGenerator';
import {createDeleteEvent} from 'test/helper/EventGenerator';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {escapeRegex} from 'Util/SanitizationUtil';
import {createUuid} from 'Util/uuid';

import {ConversationDatabaseData, ConversationMapper} from './ConversationMapper';
import {CONVERSATION_READONLY_STATE, ConversationRepository} from './ConversationRepository';
import {ConversationService} from './ConversationService';
import {ConversationState} from './ConversationState';
import {ConversationStatus} from './ConversationStatus';
import {
  ButtonActionConfirmationEvent,
  ButtonActionEvent,
  DeleteEvent,
  EventBuilder,
  MessageHiddenEvent,
} from './EventBuilder';
import {MessageRepository} from './MessageRepository';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {entities, payload} from '../../../../test/api/payloads';
import {TestFactory} from '../../../../test/helper/TestFactory';
import {generateUser} from '../../../../test/helper/UserGenerator';
import {Core} from '../../service/CoreSingleton';

function buildConversationRepository() {
  const teamState = new TeamState();
  const conversationState = new ConversationState();
  // @ts-ignore
  const conversationService = {
    deleteConversation: () => {},
    deleteConversationFromDb: () => {},
    wipeMLSCapableConversation: () => {},
    postBots: () => {},
    saveConversationStateInDb: () => {},
  } as ConversationService;
  const messageRepository = {setClientMismatchHandler: () => {}} as unknown as MessageRepository;
  // @ts-ignore
  const callingRepository = new CallingRepository();
  const connectionRepository = {
    setDeleteConnectionRequestConversationHandler: () => {},
  } as unknown as ConnectionRepository;
  const eventRepository = {
    eventService: new EventService(),
    injectEvent: () => {},
    injectEvents: () => {},
  } as unknown as EventRepository;
  const selfRepository = {on: () => {}} as unknown as SelfRepository;
  const teamRepository = {} as TeamRepository;
  const userRepository = {on: () => {}} as unknown as UserRepository;
  const userState = new UserState();
  const core = new Core();

  const conversationRepository = new ConversationRepository(
    conversationService,
    messageRepository,
    connectionRepository,
    eventRepository,
    teamRepository,
    userRepository,
    selfRepository,
    {} as any,
    callingRepository,
    {} as any,
    userState,
    teamState,
    conversationState,
    {} as any,
    core,
  );
  return [
    conversationRepository,
    {
      conversationState,
      teamState,
      userState,
      eventRepository,
      callingRepository,
      userRepository,
      teamRepository,
      messageRepository,
      conversationService,
      core,
    },
  ] as const;
}

describe('ConversationRepository', () => {
  const testFactory = new TestFactory();

  let conversation_et = _generateConversation();
  const selfConversation = _generateConversation({type: CONVERSATION_TYPE.SELF});
  let self_user_et;
  let server: sinon.SinonFakeServer;
  let storage_service: StorageService;
  const messageSenderId = createUuid();

  const _findConversation = (conversation: Conversation, conversations: () => Conversation[]) => {
    return ko.utils.arrayFirst(conversations(), _conversation => _conversation.id === conversation.id);
  };

  beforeAll(async () => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;

    const ping_url = `${Config.getConfig().BACKEND_REST}/conversations/${conversation_et.id}/knock`;
    server.respondWith('POST', ping_url, [
      HTTP_STATUS.CREATED,
      {'Content-Type': 'application/json'},
      JSON.stringify(payload.conversations.knock.post),
    ]);

    server.respondWith('GET', `${Config.getConfig().BACKEND_REST}/users?ids=${messageSenderId}`, [
      HTTP_STATUS.OK,
      {'Content-Type': 'application/json'},
      '',
    ]);

    const mark_as_read_url = `${Config.getConfig().BACKEND_REST}/conversations/${conversation_et.id}/self`;
    server.respondWith('PUT', mark_as_read_url, [HTTP_STATUS.OK, {}, '']);

    await testFactory.exposeCallingActors();
    const conversationRepository = await testFactory.exposeConversationActors();
    amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
    storage_service = conversationRepository['conversationService']['storageService'];

    spyOn(testFactory.event_repository, 'injectEvent').and.returnValue(Promise.resolve({}));
    conversation_et.id = payload.conversations.knock.post.conversation;
  });

  beforeEach(async () => {
    const conversationRepository = testFactory.conversation_repository!;

    jest.spyOn(conversationRepository['conversationService'], 'saveConversationStateInDb').mockResolvedValue({} as any);
    await conversationRepository['saveConversation'](selfConversation);
    conversationRepository['saveConversation'](conversation_et);
  });

  afterEach(() => {
    const conversationRepository = testFactory.conversation_repository!;
    conversationRepository['conversationState'].conversations.removeAll();
  });

  afterAll(async () => {
    server.restore();
    await storage_service.clearStores();
  });

  describe('saveConversation', () => {
    it('preserves existing participants when new conversation lacks them', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const user = generateUser();
      const existing = _generateConversation({type: CONVERSATION_TYPE.ONE_TO_ONE, users: [user]});
      await conversationRepository['saveConversation'](existing);

      const shell = _generateConversation({id: existing.qualifiedId, type: CONVERSATION_TYPE.ONE_TO_ONE, users: []});
      await conversationRepository['saveConversation'](shell);

      const stored = conversationRepository['conversationState'].findConversation(existing.qualifiedId)!;
      expect(stored.participating_user_ids()).toHaveLength(1);
      expect(stored.participating_user_ids()[0]).toEqual(user.qualifiedId);
    });
  });

  describe('filtered_conversations', () => {
    it('should not contain the self conversation', () => {
      const self_conversation_et = _generateConversation({type: CONVERSATION_TYPE.SELF});

      return testFactory.conversation_repository['saveConversation'](self_conversation_et).then(() => {
        expect(
          _findConversation(
            self_conversation_et,
            testFactory.conversation_repository['conversationState'].conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            self_conversation_et,
            testFactory.conversation_repository['conversationState'].filteredConversations,
          ),
        ).toBeUndefined();
      });
    });

    it('should contain blocked conversations', () => {
      const blocked_conversation_et = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        status: ConnectionStatus.BLOCKED,
      });

      return testFactory.conversation_repository['saveConversation'](blocked_conversation_et).then(() => {
        expect(
          _findConversation(
            blocked_conversation_et,
            testFactory.conversation_repository['conversationState'].conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            blocked_conversation_et,
            testFactory.conversation_repository['conversationState'].filteredConversations,
          ),
        ).toEqual(blocked_conversation_et);
      });
    });

    it('should not contain the conversation for a cancelled connection request', () => {
      const cancelled_conversation_et = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        status: ConnectionStatus.CANCELLED,
      });

      return testFactory.conversation_repository['saveConversation'](cancelled_conversation_et).then(() => {
        expect(
          _findConversation(
            cancelled_conversation_et,
            testFactory.conversation_repository['conversationState'].conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            cancelled_conversation_et,
            testFactory.conversation_repository['conversationState'].filteredConversations,
          ),
        ).toBeUndefined();
      });
    });

    it('should not contain the conversation for a pending connection request', () => {
      const pending_conversation_et = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        status: ConnectionStatus.PENDING,
      });

      return testFactory.conversation_repository['saveConversation'](pending_conversation_et).then(() => {
        expect(
          _findConversation(
            pending_conversation_et,
            testFactory.conversation_repository['conversationState'].conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            pending_conversation_et,
            testFactory.conversation_repository['conversationState'].filteredConversations,
          ),
        ).toBeUndefined();
      });
    });
  });

  describe('init1to1Conversation', () => {
    it('just returns a conversation if id of the other user cannot be found', async () => {
      const conversationRepository = testFactory.conversation_repository!;

      const conversation = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
      });

      const conversationEntity = await conversationRepository.init1to1Conversation(conversation, true);
      expect(conversationEntity).toEqual(conversation);
    });

    it('returns a conversation if we fail when fetching other users supported protocols', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);

      userRepository['userState'].users.push(otherUser);

      const conversation = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
      });

      const connection = new ConnectionEntity();
      conversation.connection(connection);
      connection.conversationId = conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);

      jest.spyOn(userRepository['userService'], 'getUserSupportedProtocols').mockRejectedValueOnce(new Error('error'));

      const conversationEntity = await conversationRepository.init1to1Conversation(conversation, true);
      expect(conversationEntity).toEqual(conversation);
    });

    it('returns a proteus conversation even if both users support mls but the user was deleted on backend', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-af03f38416', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.isDeleted = true;

      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);

      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a870-9ffbe924b2d1', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValueOnce(selfUser);

      const proteus1to1Conversation = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
      });

      const connection = new ConnectionEntity();
      proteus1to1Conversation.connection(connection);
      connection.conversationId = proteus1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);

      jest.spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation');

      const conversationEntity = await conversationRepository.init1to1Conversation(proteus1to1Conversation, true);
      expect(conversationEntity).toEqual(proteus1to1Conversation);
      expect(conversationRepository['conversationService'].getMLS1to1Conversation).not.toHaveBeenCalled();
    });

    it('returns a selected proteus 1:1 conversation with a team member even if there are multiple conversations with the same user', async () => {
      const conversationRepository = testFactory.conversation_repository!;

      const teamId = 'teamId';
      const domain = 'test-domain';

      const otherUserId = {id: 'f718411c-3833-479d-bd80-af03f38416', domain};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.teamId = teamId;

      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);

      conversationRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da91a-a495-47a870-9ffbe924b2d1', domain};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.teamId = teamId;
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const proteus1to1Conversation = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        users: [otherUser],
        overwites: {team_id: teamId, domain},
      });

      const proteus1to1Conversation2 = _generateConversation({
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        users: [otherUser],
        overwites: {team_id: teamId, domain},
      });

      conversationRepository['conversationState'].conversations.push(proteus1to1Conversation, proteus1to1Conversation2);

      const conversationEntity = await conversationRepository.init1to1Conversation(proteus1to1Conversation2, true);
      expect(conversationEntity).toEqual(proteus1to1Conversation2);
    });

    it('just returns a proteus conversation with a bot/service', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-1733-479d-bd80-af03f38416', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.isService = true;
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);

      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a417-47a870-9ffbe924b2d1', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValueOnce(selfUser);

      const proteus1to1Conversation = _generateConversation({
        type: CONVERSATION_TYPE.REGULAR,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        overwites: {team_id: 'teamId'},
      });

      proteus1to1Conversation.participating_user_ids([otherUserId]);
      proteus1to1Conversation.participating_user_ets([otherUser]);

      jest.spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation');

      const conversationEntity = await conversationRepository.init1to1Conversation(proteus1to1Conversation, true);
      expect(conversationEntity).toEqual(proteus1to1Conversation);
    });
  });

  describe('resolve1To1Conversation', () => {
    beforeEach(() => {
      testFactory.conversation_repository['conversationState'].conversations([]);
      testFactory.conversation_repository['userState'].users([]);
      testFactory.conversation_repository['initiatingMlsConversationQualifiedIds'] = [];

      jest.clearAllMocks();
    });

    beforeAll(() => {
      jest
        .spyOn(testFactory.conversation_repository!, 'saveConversation')
        .mockImplementation((conversation: Conversation) => {
          testFactory.conversation_repository['conversationState'].conversations.push(conversation);
          return Promise.resolve(conversation);
        });
    });

    it('finds an existing 1:1 conversation within a team', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const team1to1Conversation: Partial<ConversationDatabaseData> = {
        access: [CONVERSATION_ACCESS.INVITE],
        creator: '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
        domain: 'test-domain',
        id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e',
        members: {
          others: [{id: 'f718410c-3833-479d-bd80-a5df03f38414', status: 0}],
          self: {
            hidden: false,
            hidden_ref: null,
            id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
            otr_archived: false,
            otr_archived_ref: null,
            otr_muted_ref: null,
            otr_muted_status: 0,
            service: null,
            status_ref: '0.0',
            status_time: '1970-01-01T00:00:00.000Z',
          },
        },
        name: '',
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        team: 'cf162e22-20b8-4533-a5ab-d3f5dde39d2c',
        type: 0,
      };

      const [newConversationEntity] = ConversationMapper.mapConversations([
        team1to1Conversation as ConversationDatabaseData,
      ]);
      conversationRepository['conversationState'].conversations.push(newConversationEntity);

      const teamId = team1to1Conversation.team;
      const teamMemberId = team1to1Conversation.members?.others[0].id;
      const userEntity = new User(teamMemberId, 'test-domain');

      const selfUser = generateUser();
      selfUser.teamId = teamId;
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);
      userEntity.teamId = teamId;
      userEntity.isTeamMember(true);
      userEntity.teamId = teamId;
      userEntity.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);

      userRepository['userState'].users.push(userEntity);

      selfUser.teamId = teamId;
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);

      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(userEntity.qualifiedId);

      expect(conversationEntity).toBe(newConversationEntity);
    });

    it('returns proteus 1:1 conversation if one of the users does not support mls', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const proteus1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
      }) as BackendConversation;

      const connection = new ConnectionEntity();
      connection.userId = otherUserId;
      connection.status(ConnectionStatus.ACCEPTED);
      connection.conversationId = proteus1to1ConversationResponse.qualified_id;
      otherUser.connection(connection);

      const [proteus1to1Conversation] = conversationRepository.mapConversations([proteus1to1ConversationResponse]);

      jest.spyOn(conversationRepository['conversationService'], 'removeConversationFromBlacklist');
      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(proteus1to1ConversationResponse);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(proteus1to1Conversation.serialize());
      expect(conversationEntity?.readOnlyState()).toEqual(null);
      expect(conversationRepository['conversationService'].removeConversationFromBlacklist).toHaveBeenCalledWith(
        conversationEntity?.qualifiedId,
      );
    });

    it('returns proteus 1:1 conversation and marks it as readonly if the other user does not support proteus', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const proteus1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
      }) as BackendConversation;

      const connection = new ConnectionEntity();
      connection.status(ConnectionStatus.ACCEPTED);
      connection.userId = otherUserId;
      connection.conversationId = proteus1to1ConversationResponse.qualified_id;
      otherUser.connection(connection);

      jest.spyOn(conversationRepository['conversationService'], 'blacklistConversation');
      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(proteus1to1ConversationResponse);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.readOnlyState()).toEqual(
        CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS,
      );
      expect(conversationRepository['conversationService'].blacklistConversation).toHaveBeenCalledWith(
        conversationEntity?.qualifiedId,
      );
    });

    it('returns established mls 1:1 conversation if both users support mls', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId', others: [otherUserId.id], qualified_others: [otherUserId]},
      }) as BackendMLSConversation;

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: mls1to1ConversationResponse});

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(true);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
    });

    it('replaces proteus 1:1 with mls 1:1', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const mockedGroupId = 'groupId';

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId', archived_state: false, muted_state: NOTIFICATION_STATE.NOTHING},
      }) as BackendMLSConversation;

      const proteus1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b123e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        overwites: {archived_state: true, muted_state: NOTIFICATION_STATE.EVERYTHING},
      }) as BackendMLSConversation;

      const [mls1to1Conversation, proteus1to1Conversation] = conversationRepository.mapConversations([
        mls1to1ConversationResponse,
        proteus1to1ConversationResponse,
      ]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;

      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);
      proteus1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation, proteus1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: mls1to1ConversationResponse});
      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const establishedMls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {
          group_id: mockedGroupId,
          epoch: 1,
          qualified_others: [otherUserId],
          members: {
            others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
            self: {},
          } as any,
        },
      }) as BackendMLSConversation;

      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

      jest.spyOn(conversationRepository['eventService'], 'moveEventsToConversation');
      jest
        .spyOn(conversationRepository['conversationState'], 'activeConversation')
        .mockReturnValueOnce(proteus1to1Conversation);
      jest.spyOn(conversationRepository['conversationService'], 'deleteConversationFromDb');
      jest.spyOn(conversationRepository['conversationService'], 'blacklistConversation');
      jest.spyOn(conversationRepository['eventRepository'], 'injectEvent').mockResolvedValueOnce(undefined);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationRepository['eventService'].moveEventsToConversation).toHaveBeenCalledWith(
        proteus1to1Conversation.qualifiedId,
        mls1to1Conversation.qualifiedId,
      );

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());

      //Local properties were migrated from proteus to mls conversation
      expect(conversationEntity?.serialize().archived_state).toEqual(proteus1to1Conversation.archivedState());
      expect(conversationEntity?.serialize().muted_state).toEqual(proteus1to1Conversation.mutedState());

      //proteus conversation was deleted from the local store
      expect(conversationRepository['conversationService'].deleteConversationFromDb).toHaveBeenCalledWith(
        proteus1to1Conversation.id,
      );
      expect(conversationRepository['conversationService'].blacklistConversation).toHaveBeenCalledWith(
        proteus1to1Conversation.qualifiedId,
      );
      expect(container.resolve(Core).service!.conversation.establishMLS1to1Conversation).toHaveBeenCalled();
      expect(conversationRepository['eventRepository'].injectEvent).toHaveBeenCalled();
      expect(conversationRepository['conversationState'].conversations()).not.toEqual(
        expect.arrayContaining([proteus1to1Conversation]),
      );
    });

    it("establishes MLS 1:1 conversation if it's not yet established", async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;
      const mockedGroupId = 'groupId';

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const mockSelfClientId = 'client-id';
      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: mockedGroupId},
      }) as BackendMLSConversation;

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: mls1to1ConversationResponse});
      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const establishedMls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {
          group_id: mockedGroupId,
          epoch: 1,
          qualified_others: [otherUserId],
          members: {
            others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
            self: {},
          } as any,
        },
      }) as BackendMLSConversation;

      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

      Object.defineProperty(container.resolve(Core), 'clientId', {
        get: jest.fn(() => mockSelfClientId),
        configurable: true,
      });

      const [mls1to1Conversation] = conversationRepository.mapConversations([establishedMls1to1ConversationResponse]);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(container.resolve(Core).service!.conversation.establishMLS1to1Conversation).toHaveBeenCalledWith(
        mockedGroupId,
        {client: mockSelfClientId, user: selfUserId},
        otherUserId,
      );
      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
    });

    it('establishes MLS 1:1 conversation between team members', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;
      const teamId = 'team-id';
      const mockedGroupId = 'groupId';

      const otherUserId = {id: 'f71840c-3833-479d-bd80-a5dk03f38414', domain: 'testt-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.teamId = teamId;
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495asd47a8-ac70-9kfbe924b2d0', domain: 'testt-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.teamId = teamId;

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: mockedGroupId},
      }) as BackendMLSConversation;

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: mls1to1ConversationResponse});

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const establishedMls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {
          group_id: mockedGroupId,
          epoch: 1,
          qualified_others: [otherUserId],
          members: {
            others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
            self: {},
          } as any,
        },
      }) as BackendMLSConversation;

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: establishedMls1to1ConversationResponse});
      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValueOnce(selfUser);

      await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(container.resolve(Core).service!.conversation.establishMLS1to1Conversation).toHaveBeenCalled();
    });

    it("establishes MLS 1:1 conversation if it's a team-owned 1:1 conversation only if it was already established on backend", async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;
      const teamId = 'team-id';
      const mockedGroupId = 'groupId';

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03aa8414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbeaa4b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      selfUser.teamId = teamId;
      otherUser.teamId = teamId;

      const establishedMls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {
          group_id: mockedGroupId,
          epoch: 1,
          qualified_others: [otherUserId],
          members: {
            others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
            self: {},
          } as any,
        },
      }) as BackendMLSConversation;

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: establishedMls1to1ConversationResponse});
      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

      const [mls1to1Conversation] = conversationRepository.mapConversations([establishedMls1to1ConversationResponse]);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
      expect(container.resolve(Core).service!.conversation.establishMLS1to1Conversation).toHaveBeenCalled();
    });

    it('returns established mls 1:1 conversation if conversation exists locally even when proteus is choosen.', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId'},
      }) as BackendMLSConversation;

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(true);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
    });

    it('marks mls 1:1 conversation as read-only if the other user does not support mls and mls 1:1 was never established', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId'},
      }) as BackendMLSConversation;

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
      expect(conversationEntity?.readOnlyState()).toEqual(
        CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS,
      );
    });

    it('marks mls 1:1 conversation as read-only if both users support mls but the other user has no keys available', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'a718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '1a9da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '0aab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId'},
      }) as BackendMLSConversation;

      const noKeysError = new ClientMLSError(ClientMLSErrorLabel.NO_KEY_PACKAGES_AVAILABLE);

      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockRejectedValueOnce(noKeysError);

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
      expect(conversationEntity?.readOnlyState()).toEqual(
        CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_NO_KEY_PACKAGES,
      );
    });

    it('deos not mark mls 1:1 conversation as read-only if the other user does not support mls but mls 1:1 was already established', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: 'groupId'},
      }) as BackendMLSConversation;

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(true);

      const conversationEntity = await conversationRepository.resolve1To1Conversation(otherUser.qualifiedId);

      expect(conversationEntity?.serialize()).toEqual(mls1to1Conversation.serialize());
      expect(conversationEntity?.readOnlyState()).toEqual(null);
    });

    it('re-evaluates 1:1 conversation with user after their supported protocols are updated', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;
      const mockedGroupId = 'groupId';

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      userRepository['userState'].users.push(otherUser);

      const mockSelfClientId = 'client-id';
      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const mls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {group_id: mockedGroupId},
      }) as BackendMLSConversation;

      const [mls1to1Conversation] = conversationRepository.mapConversations([mls1to1ConversationResponse]);

      const connection = new ConnectionEntity();
      connection.conversationId = mls1to1Conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);
      mls1to1Conversation.connection(connection);

      conversationRepository['conversationState'].conversations.push(mls1to1Conversation);

      jest
        .spyOn(conversationRepository['conversationService'], 'getMLS1to1Conversation')
        .mockResolvedValueOnce({conversation: mls1to1ConversationResponse});

      jest
        .spyOn(conversationRepository['conversationService'], 'isMLSGroupEstablishedLocally')
        .mockResolvedValueOnce(false);

      const establishedMls1to1ConversationResponse = generateAPIConversation({
        id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
        protocol: CONVERSATION_PROTOCOL.MLS,
        overwites: {
          group_id: mockedGroupId,
          epoch: 1,
          qualified_others: [otherUserId],
          members: {
            others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
          } as any,
        },
      }) as BackendMLSConversation;

      jest
        .spyOn(container.resolve(Core).service!.conversation, 'establishMLS1to1Conversation')
        .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

      Object.defineProperty(container.resolve(Core), 'clientId', {
        get: jest.fn(() => mockSelfClientId),
        configurable: true,
      });

      jest.spyOn(conversationRepository, 'resolve1To1Conversation');

      userRepository.emit('supportedProtocolsUpdated', {
        user: otherUser,
        supportedProtocols: [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS],
      });

      await waitFor(() => {
        expect(conversationRepository.resolve1To1Conversation).toHaveBeenCalledWith(otherUser.qualifiedId, {
          isLiveUpdate: true,
        });
      });
    });

    it('does not re-evaluates 1:1 conversation with user after their supported protocols are updated if conversation did not exist before', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);

      jest.spyOn(conversationRepository, 'resolve1To1Conversation');

      conversationRepository['conversationState'].conversations([]);

      userRepository.emit('supportedProtocolsUpdated', {
        user: otherUser,
        supportedProtocols: [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS],
      });

      await waitFor(() => {
        expect(conversationRepository.resolve1To1Conversation).not.toHaveBeenCalled();
      });
    });
  });

  describe('create1to1ConversationWithService', () => {
    it('creates a 1:1 conversation with a service', async () => {
      const [conversationRepository, {conversationService}] = buildConversationRepository();

      const serviceId = 'service-id';
      const providerId = 'provider-id';

      const createdConversation = new Conversation('id', 'domain');

      const memberJoinEvent: ConversationMemberJoinEvent = {
        conversation: conversation_et.id,
        data: {
          user_ids: ['9028624e-bfef-490a-ba61-01683f5ccc83'],
        },
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        time: '2015-04-27T11:42:31.475Z',
        type: CONVERSATION_EVENT.MEMBER_JOIN,
      };

      jest.spyOn(conversationRepository, 'createGroupConversation').mockResolvedValueOnce(createdConversation);
      jest.spyOn(conversationService, 'postBots').mockResolvedValueOnce(memberJoinEvent);

      await conversationRepository.create1to1ConversationWithService({providerId, serviceId});

      expect(conversationRepository.createGroupConversation).toHaveBeenCalled();
    });

    it('deletes the conversation when adding a service failed', async () => {
      const [conversationRepository, {teamState, conversationService}] = buildConversationRepository();

      const serviceId = 'service-id';
      const providerId = 'provider-id';

      const teamId = createUuid();

      teamState.team({id: teamId} as any);

      const createdConversation = new Conversation('id', 'domain');

      jest.spyOn(conversationRepository, 'createGroupConversation').mockResolvedValueOnce(createdConversation);
      jest.spyOn(conversationService, 'postBots').mockRejectedValueOnce(new Error(''));

      await expect(async () => {
        await conversationRepository.create1to1ConversationWithService({providerId, serviceId});
        expect(conversationRepository.createGroupConversation).toHaveBeenCalled();
        expect(conversationRepository.deleteConversation).toHaveBeenCalledWith(createdConversation);
      }).rejects.toThrow();
    });
  });

  describe('mapConnections', () => {
    it("maps a connection to connection request placeholder for 1:1 conversation when there's an outgoing connection request", async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const userRepository = testFactory.user_repository!;

      const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df03f38414', domain: 'test-domain'};
      const otherUser = new User(otherUserId.id, otherUserId.domain);
      otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS]);
      userRepository['userState'].users.push(otherUser);

      const selfUserId = {id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0', domain: 'test-domain'};
      const selfUser = new User(selfUserId.id, selfUserId.domain);
      selfUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);

      const conversation = _generateConversation({type: CONVERSATION_TYPE.ONE_TO_ONE});
      conversationRepository['conversationState'].conversations.push(conversation);

      const connection = new ConnectionEntity();
      connection.status(ConnectionStatus.SENT);
      connection.conversationId = conversation.qualifiedId;
      connection.userId = otherUserId;
      otherUser.connection(connection);

      jest.spyOn(conversationRepository['conversationService'], 'removeConversationFromBlacklist');

      await conversationRepository.init1To1Conversations([connection], [conversation]);
      expect(conversation.type()).toEqual(CONVERSATION_TYPE.CONNECT);
    });
  });

  describe('getGroupsByName', () => {
    beforeEach(() => {
      const group_a = _generateConversation();
      group_a.name('Web Dudes');

      const group_b = _generateConversation();
      group_b.name('René, Benny, Gregor, Lipis');

      const group_c = _generateConversation();
      self_user_et = new User('id', null);
      self_user_et.name('John');
      group_c.participating_user_ets.push(self_user_et);

      const group_cleared = _generateConversation();
      group_cleared.name('Cleared');
      group_cleared.last_event_timestamp(Date.now() - 1000);
      group_cleared.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);

      const group_removed = _generateConversation();
      group_removed.name('Removed');
      group_removed.last_event_timestamp(Date.now() - 1000);
      group_removed.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);
      group_removed.status(ConversationStatus.PAST_MEMBER);

      return Promise.all([
        testFactory.conversation_repository['saveConversation'](group_a),
        testFactory.conversation_repository['saveConversation'](group_b),
        testFactory.conversation_repository['saveConversation'](group_c),
        testFactory.conversation_repository['saveConversation'](group_cleared),
      ]);
    });

    it('should return expected matches', () => {
      let result = testFactory.conversation_repository.getGroupsByName('Web Dudes', false);

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('Dudes', false);

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('e', false);

      expect(result.length).toBe(4);

      result = testFactory.conversation_repository.getGroupsByName('Rene', false);

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('John', false);

      expect(result.length).toBe(1);
    });

    it('should return a cleared group with the user still being member of it', () => {
      const result = testFactory.conversation_repository.getGroupsByName('Cleared', false);

      expect(result.length).toBe(1);
    });

    it('should not return a cleared group that the user left', () => {
      const result = testFactory.conversation_repository.getGroupsByName('Removed', false);

      expect(result.length).toBe(0);
    });
  });

  describe('getPrecedingMessages', () => {
    it('gets messages which are not broken by design', async () => {
      spyOn(testFactory.user_repository, 'getUserById').and.returnValue(Promise.resolve(new User('id', null)));
      const selfUser = generateUser();
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

      const conversation = new Conversation(createUuid());
      const messageWithoutTime = {
        conversation: `${conversation.id}`,
        data: {content: 'Hello World :)', nonce: 'aeac8355-739b-4dfc-a119-891a52c6a8dc'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: 'aeac8355-739b-4dfc-a119-891a52c6a8dc',
        type: 'conversation.message-add',
      };
      const messageWithTime = {
        conversation: `${conversation.id}`,
        data: {content: 'Fifth message', nonce: '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb', previews: [] as any[]},
        from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
        id: '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb',
        time: '2016-08-04T13:28:33.389Z',
        type: 'conversation.message-add',
      };

      const bad_message_key = `${conversation.id}@${messageWithoutTime.from}@NaN`;
      /**
       * The 'events' table uses auto-incremented inbound keys, so there is no need to define a key, when saving a record.
       *  - With Dexie 2.x, specifying a key when saving a record with an auto-inc. inbound key results in an error: "Data provided to an operation does not meet requirements"
       *  - With Dexie 3.x, specifying a key when saving a record with an auto-inc. inbound key just fails silently
       */
      await storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, bad_message_key, messageWithoutTime);
      await storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, messageWithTime);
      const loadedEvents = await testFactory.conversation_repository.getPrecedingMessages(conversation);

      expect(loadedEvents.length).toBe(1);
      expect(loadedEvents[0].id).toBe(messageWithTime.id);
    });
  });

  describe('clearConversation', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('clears all the messages from database and local state and re-applies creation message', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const messageRepository = testFactory.message_repository!;
      const eventRepository = testFactory.event_repository!;

      const conversationEntity = _generateConversation({type: CONVERSATION_TYPE.REGULAR});
      const selfUser = generateUser();

      conversationEntity.selfUser(selfUser);

      jest.spyOn(eventRepository, 'injectEvent').mockImplementationOnce(jest.fn());
      jest.spyOn(messageRepository, 'updateClearedTimestamp').mockImplementationOnce(jest.fn());
      jest.spyOn(conversationEntity, 'removeMessages').mockImplementationOnce(jest.fn());
      jest.spyOn(conversationRepository['eventService'], 'deleteEvents').mockImplementationOnce(jest.fn());

      const mockedCurrentDate = new Date(1000);
      jest.setSystemTime(mockedCurrentDate);
      await conversationRepository.clearConversation(conversationEntity);

      expect(messageRepository.updateClearedTimestamp).toHaveBeenCalledWith(conversationEntity);
      expect(conversationEntity.removeMessages).toHaveBeenCalled();
      expect(conversationRepository['eventService'].deleteEvents).toHaveBeenCalledWith(
        conversationEntity.id,
        mockedCurrentDate.toISOString(),
      );

      expect(eventRepository.injectEvent).toHaveBeenCalledWith(
        expect.objectContaining({type: CONVERSATION.GROUP_CREATION, conversation: conversationEntity.id}),
        undefined,
      );
    });
  });

  describe('mapConnection', () => {
    let connectionEntity: ConnectionEntity;

    beforeEach(() => {
      connectionEntity = new ConnectionEntity();
      connectionEntity.conversationId = conversation_et.qualifiedId;
      connectionEntity.userId = {id: 'id', domain: 'domain'};

      const conversation_payload = {
        creator: conversation_et.id,
        id: conversation_et.id,
        members: {
          others: [],
          self: {
            hidden_ref: null,
            id: conversation_et.id,
            otr_archived_ref: null,
            otr_muted_ref: null,
            otr_muted_status: 0,
            service: null,
            status_ref: '0.0',
            status_time: '2015-01-28T12:53:41.847Z',
          },
        },
        name: null,
        type: 2,
      } as ConversationDatabaseData;

      spyOn(testFactory.conversation_repository as any, 'fetchConversationById').and.callThrough();
      spyOn(testFactory.user_repository, 'getUserSupportedProtocols').and.returnValue([CONVERSATION_PROTOCOL.PROTEUS]);
      spyOn(testFactory.self_repository, 'getSelfSupportedProtocols').and.returnValue([CONVERSATION_PROTOCOL.PROTEUS]);
      spyOn(testFactory.conversation_service, 'getConversationById').and.returnValue(
        Promise.resolve(conversation_payload),
      );
      spyOn(testFactory.user_repository, 'getUsersById').and.returnValue(Promise.resolve([]));
    });

    it('should map a connection to an existing conversation', () => {
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      const conversationRepository = testFactory.conversation_repository!;
      const user = new User('id', 'domain');
      user.connection(connectionEntity);
      connectionEntity.userId = user.qualifiedId;
      conversationRepository['userState'].users.push(user);

      return testFactory.conversation_repository['mapConnection'](connectionEntity).then(
        (_conversation: Conversation) => {
          expect(testFactory.conversation_repository['fetchConversationById']).not.toHaveBeenCalled();
          expect(testFactory.conversation_service.getConversationById).not.toHaveBeenCalled();
          expect(_conversation.connection()).toBe(connectionEntity);
        },
      );
    });

    it('should map a connection to a new conversation', () => {
      const conversationRepository = testFactory.conversation_repository!;
      const user = new User('id1', 'domain1');
      user.connection(connectionEntity);
      connectionEntity.userId = user.qualifiedId;
      conversationRepository['userState'].users.push(user);

      connectionEntity.status(ConnectionStatus.ACCEPTED);
      conversationRepository['conversationState'].conversations.removeAll();

      return conversationRepository['mapConnection'](connectionEntity).then(_conversation => {
        expect(conversationRepository['fetchConversationById']).toHaveBeenCalled();
        expect(testFactory.conversation_service.getConversationById).toHaveBeenCalled();
        expect(_conversation.connection()).toBe(connectionEntity);
      });
    });

    it('should map a cancelled connection to an existing conversation and filter it', () => {
      const conversationRepository = testFactory.conversation_repository!;
      const user = new User('id', 'domain');
      user.connection(connectionEntity);
      connectionEntity.userId = user.qualifiedId;
      conversationRepository['userState'].users.push(user);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);
      connectionEntity.status(ConnectionStatus.CANCELLED);

      return conversationRepository['mapConnection'](connectionEntity).then(_conversation => {
        expect(_conversation.connection()).toBe(connectionEntity);
        expect(
          _findConversation(_conversation, conversationRepository['conversationState'].conversations),
        ).not.toBeUndefined();

        expect(
          _findConversation(_conversation, conversationRepository['conversationState'].filteredConversations),
        ).toBeUndefined();
      });
    });
  });

  describe('handleConversationEvent', () => {
    it('detects events send by a user not in the conversation', () => {
      const selfUser = generateUser();
      const conversationEntity = _generateConversation();
      const event = {
        conversation: conversationEntity.id,
        data: {},
        from: messageSenderId,
        id: createUuid(),
        time: '2017-09-06T09:43:36.528Z',
        type: 'conversation.message-add',
      };

      jest.spyOn(testFactory.user_repository, 'getUserById').mockResolvedValue(new User());
      spyOn(testFactory.conversation_repository, 'addMissingMember').and.returnValue(
        Promise.resolve(conversationEntity),
      );
      spyOn(testFactory.conversation_repository, 'getConversationById').and.returnValue(
        Promise.resolve(conversationEntity),
      );
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

      return testFactory.conversation_repository['handleConversationEvent'](event as any).then(() => {
        expect(testFactory.conversation_repository.addMissingMember).toHaveBeenCalledWith(
          conversationEntity,
          [
            {
              domain: '',
              id: event.from,
            },
          ],
          new Date(event.time).getTime() - 1,
        );
      });
    });

    describe('conversation.mls-welcome', () => {
      it('should initialise mls 1:1 conversation after receiving a welcome', async () => {
        const conversationRepository = testFactory.conversation_repository!;
        const mockedGroupId = 'AAEAAKA0LuGtiU7NjqqlZIE2dQUAZWxuYS53aXJlLmxpbms=';

        const conversation = _generateConversation({
          groupId: mockedGroupId,
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          protocol: CONVERSATION_PROTOCOL.MLS,
        });

        const otherUserId = {id: 'f718410c-3833-479d-bd80-a5df01138411', domain: 'test-domain'};
        const otherUser = new User(otherUserId.id, otherUserId.domain);
        otherUser.supportedProtocols([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]);

        conversationRepository['userState'].users.push(otherUser);
        conversation.participating_user_ids.push(otherUserId);

        await conversationRepository['saveConversation'](conversation);

        const welcomeEvent: ConversationMLSWelcomeEvent = {
          conversation: conversation.id,
          data: conversation.groupId!,
          from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
          time: '2015-04-27T11:42:31.475Z',
          type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        };

        const coreConversationService = container.resolve(Core).service!.conversation!;

        jest.spyOn(coreConversationService, 'isMLSGroupEstablishedLocally').mockResolvedValueOnce(false);

        const establishedMls1to1ConversationResponse = generateAPIConversation({
          id: {id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e', domain: 'test-domain'},
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          protocol: CONVERSATION_PROTOCOL.MLS,
          overwites: {
            group_id: mockedGroupId,
            epoch: 1,
            qualified_others: [otherUserId],
            members: {
              others: [{id: otherUserId.id, status: 0, qualified_id: otherUserId}],
              self: {},
            } as any,
          },
        }) as BackendMLSConversation;

        jest
          .spyOn(coreConversationService, 'establishMLS1to1Conversation')
          .mockResolvedValueOnce(establishedMls1to1ConversationResponse);

        await conversationRepository['handleConversationEvent'](welcomeEvent);

        expect(coreConversationService.establishMLS1to1Conversation).toHaveBeenCalled();
      });
    });

    describe('conversation.asset-add', () => {
      beforeEach(() => {
        const matchUsers = new RegExp(`${escapeRegex(Config.getConfig().BACKEND_REST)}/users\\?ids=([a-z0-9-,]+)`);
        (server as any).respondWith('GET', matchUsers, (xhr: any, ids: string) => {
          const users = [];
          for (const userId of ids.split(',')) {
            users.push({
              accent_id: 0,
              assets: [],
              handle: `handle_${userId}`,
              id: userId,
              locale: 'en',
              name: `name_${userId}`,
              picture: [
                {
                  content_length: 19190,
                  content_type: 'image/jpeg',
                  data: null,
                  id: 'ab7eb2f7-7c5b-4e55-ab16-dfc206891e67',
                  info: {
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    height: 280,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    original_width: 620,
                    public: true,
                    tag: 'smallProfile',
                    width: 280,
                  },
                },
                {
                  content_length: 82690,
                  content_type: 'image/jpeg',
                  data: null,
                  id: '87c95372-fce7-4215-861a-a3e0fe262e48',
                  info: {
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    height: 960,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    original_width: 620,
                    public: true,
                    tag: 'medium',
                    width: 620,
                  },
                },
              ],
            });
          }
          xhr.respond(HTTP_STATUS.OK, {'Content-Type': 'application/json'}, JSON.stringify(users));
        });

        const matchConversations = new RegExp(`${escapeRegex(Config.getConfig().BACKEND_REST)}/conversations/.*/(.*)`);
        (server as any).respondWith('GET', matchConversations, (xhr: any, conversationId: string) => {
          const conversation = {
            access: [CONVERSATION_ACCESS.PRIVATE],
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.ACTIVATED,
            creator: '6761450e-1bd6-4027-a338-1191fe5e349f',
            id: conversationId,
            members: {
              others: [{id: '6761450e-1bd6-4027-a338-1191fe5e349f', status: 0}],
              self: {
                hidden: false,
                hidden_ref: null,
                id: '8a88604a-430a-42ed-966e-19a35c3d292a',
                otr_archived: false,
                otr_archived_ref: null,
                otr_muted_ref: null,
                otr_muted_status: 0,
                service: null,
                status_ref: '0.0',
                status_time: '1970-01-01T00:00:00.000Z',
              },
            },
            name: null,
            team: null,
            type: 2,
          } as ConversationDatabaseData;
          xhr.respond(HTTP_STATUS.OK, {'Content-Type': 'application/json'}, JSON.stringify(conversation));
        });
      });

      afterEach(() => {
        server.restore();
      });

      it("shows a failed message on the sender's side if the upload fails", () => {
        const selfUser = generateUser();
        const conversation_id = createUuid();
        const conversationQualifiedId = {domain: '', id: conversation_id};
        const message_id = createUuid();
        const sending_user_id = selfUser.id;
        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);
        spyOn(Config, 'getConfig').and.returnValue({
          FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
        });

        const upload_start: LegacyEventRecord = {
          category: 512,
          conversation: conversation_id,
          data: {
            content_length: 23089240,
            content_type: 'application/x-msdownload',
            info: {name: 'AirDroid_Desktop_Client_3.4.2.0.exe', nonce: '79072f78-15ee-4d54-a63c-fd46cd5607ae'},
          },
          from: sending_user_id,
          id: message_id,
          primary_key: '107',
          qualified_conversation: {domain: '', id: conversation_id},
          status: 1,
          time: '2017-09-06T09:43:32.278Z',
          type: 'conversation.asset-add',
        };
        const upload_failed: LegacyEventRecord = {
          conversation: conversation_id,
          data: {reason: 1, status: 'upload-failed'},
          from: sending_user_id,
          id: message_id,
          qualified_conversation: {domain: '', id: conversation_id},
          status: 1,
          time: '2017-09-06T16:14:08.165Z',
          type: 'conversation.asset-add',
        };

        const conversation_payload = {
          creator: conversation_et.id,
          id: conversation_id,
          qualified_id: conversationQualifiedId,
          members: {
            others: [],
            self: {
              hidden_ref: null,
              id: conversation_et.id,
              otr_archived_ref: null,
              otr_muted_ref: null,
              otr_muted_status: 0,
              service: null,
              status_ref: '0.0',
              status_time: '2015-01-28T12:53:41.847Z',
            },
          },
          name: '',
          type: 0,
        } as unknown as BackendConversation;

        jest
          .spyOn(testFactory.conversation_repository['conversationService'], 'getConversationById')
          .mockResolvedValue(conversation_payload);

        return testFactory.conversation_repository['fetchConversationById']({domain: '', id: conversation_id})
          .then(fetched_conversation => {
            expect(fetched_conversation).toBeDefined();
            testFactory.conversation_repository['conversationState'].activeConversation(fetched_conversation);
            return testFactory.conversation_repository['handleConversationEvent'](upload_start as any);
          })
          .then(() => {
            const number_of_messages = Object.keys(
              testFactory.conversation_repository['conversationState'].activeConversation().messages(),
            ).length;

            expect(number_of_messages).toBe(1);
            return testFactory.conversation_repository['handleConversationEvent'](upload_failed as any);
          })
          .then(() => {
            const number_of_messages = Object.keys(
              testFactory.conversation_repository['conversationState'].activeConversation().messages(),
            ).length;

            expect(number_of_messages).toBe(1);
          });
      });
    });

    describe('conversation.create', () => {
      let conversationId: string;
      let createEvent: ConversationCreateEvent;

      beforeEach(() => {
        spyOn(testFactory.conversation_repository as any, 'onCreate').and.callThrough();
        spyOn(testFactory.conversation_repository, 'mapConversations').and.returnValue([
          new Conversation(createUuid()),
        ]);
        spyOn(testFactory.conversation_repository, 'updateParticipatingUserEntities').and.returnValue(true);
        spyOn(testFactory.conversation_repository as any, 'saveConversation').and.returnValue(false);

        conversationId = createUuid();
        createEvent = {
          conversation: conversationId,
          data: {
            access: [CONVERSATION_ACCESS.INVITE],
            access_role: CONVERSATION_LEGACY_ACCESS_ROLE.ACTIVATED,
            access_role_v2: [],
            cells_state: CONVERSATION_CELLS_STATE.DISABLED,
            creator: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
            last_event: '0.0',
            last_event_time: '1970-01-01T00:00:00.000Z',
            members: {
              others: [
                {
                  conversation_role: 'wire_admin',
                  id: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
                  qualified_id: {
                    domain: 'bella.wire.link',
                    id: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
                  },
                  status: 0,
                },
              ],
              self: {
                conversation_role: 'wire_member',
                hidden: false,
                hidden_ref: null,
                id: '9dcb21e0-9670-4d05-8590-408f3686c873',
                otr_archived: false,
                otr_archived_ref: null,
                otr_muted_ref: null,
                otr_muted_status: null,
                service: null,
                status_ref: '0.0',
                status_time: '1970-01-01T00:00:00.000Z',
              },
            },
            message_timer: null,
            name: '-, benny_bella',
            protocol: CONVERSATION_PROTOCOL.PROTEUS,
            qualified_id: {
              domain: 'bella.wire.link',
              id: 'c9405f98-e25a-4b1f-ade7-227ea765dff7',
            },
            receipt_mode: null,
            team: null,
            type: 0,
          },
          from: '',
          time: '',
          type: CONVERSATION_EVENT.CREATE,
        };
      });

      it('should process create event for a new conversation created locally', () => {
        jest
          .spyOn(testFactory.conversation_repository['conversationService'], 'getConversationById')
          .mockResolvedValueOnce(createEvent.data);
        return testFactory.conversation_repository['handleConversationEvent'](createEvent).then(() => {
          expect(testFactory.conversation_repository['onCreate']).toHaveBeenCalled();
          expect(testFactory.conversation_repository.mapConversations).toHaveBeenCalledWith([createEvent.data], 1);
        });
      });

      it('should process create event for a new conversation created remotely', () => {
        const time = new Date();
        createEvent.time = time.toISOString();

        jest
          .spyOn(testFactory.conversation_repository['conversationService'], 'getConversationById')
          .mockResolvedValue(createEvent.data);
        return testFactory.conversation_repository['handleConversationEvent'](createEvent).then(() => {
          expect(testFactory.conversation_repository['onCreate']).toHaveBeenCalled();
          expect(testFactory.conversation_repository.mapConversations).toHaveBeenCalledWith(
            [createEvent.data],
            time.getTime(),
          );
        });
      });
    });

    describe('conversation.member-join', () => {
      let memberJoinEvent: ConversationMemberJoinEvent;

      beforeEach(async () => {
        spyOn(testFactory.conversation_repository as any, 'onMemberJoin').and.callThrough();
        spyOn(testFactory.conversation_repository, 'updateParticipatingUserEntities').and.callThrough();
        spyOn(testFactory.user_repository, 'getUsersById').and.returnValue(Promise.resolve([]));
        spyOn(container.resolve(Core).service!.conversation, 'mlsGroupExistsLocally').and.returnValue(
          Promise.resolve(true),
        );

        conversation_et = _generateConversation();

        memberJoinEvent = {
          conversation: conversation_et.id,
          data: {
            user_ids: ['9028624e-bfef-490a-ba61-01683f5ccc83'],
          },
          from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
          time: '2015-04-27T11:42:31.475Z',
          type: CONVERSATION_EVENT.MEMBER_JOIN,
        };
      });

      it('should process member-join event when joining a group conversation', () => {
        const selfUser = generateUser();
        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository['handleConversationEvent'](memberJoinEvent).then(() => {
          expect(testFactory.conversation_repository['onMemberJoin']).toHaveBeenCalled();
          expect(testFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();
        });
      });

      it.each([CONVERSATION_PROTOCOL.MIXED, CONVERSATION_PROTOCOL.MLS])(
        'should add other self clients to mls/mixed conversation MLS group if user was event creator',
        async protocol => {
          const mockDomain = 'example.com';
          const mockSelfClientId = 'self-client-id';
          const selfUser = generateUser({id: createUuid(), domain: mockDomain});

          const conversationEntity = _generateConversation({
            protocol: protocol,
            id: {domain: mockDomain, id: 'test-id'},
          });

          testFactory.conversation_repository['saveConversation'](conversationEntity);

          const memberJoinEvent = {
            conversation: conversationEntity.id,
            data: {
              user_ids: [selfUser.id],
            },
            from: selfUser.id,
            time: '2015-04-27T11:42:31.475Z',
            type: CONVERSATION_EVENT.MEMBER_JOIN,
          } as ConversationMemberJoinEvent;

          jest.spyOn(testFactory.conversation_repository['userState'], 'self').mockReturnValue(selfUser);

          Object.defineProperty(container.resolve(Core), 'clientId', {
            get: jest.fn(() => mockSelfClientId),
            configurable: true,
          });

          jest.spyOn(container.resolve(Core).service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

          const conversationRepo = testFactory.conversation_repository!;
          jest.spyOn(conversationRepo['conversationService'], 'mlsGroupExistsLocally').mockResolvedValue(false);

          return testFactory.conversation_repository['handleConversationEvent'](memberJoinEvent).then(() => {
            expect(testFactory.conversation_repository['onMemberJoin']).toHaveBeenCalled();
            expect(testFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();

            testFactory.conversation_repository['saveConversation'](conversationEntity);

            const memberJoinEvent = {
              conversation: conversationEntity.id,
              data: {
                user_ids: [selfUser.id],
              },
              from: selfUser.id,
              time: '2015-04-27T11:42:31.475Z',
              type: CONVERSATION_EVENT.MEMBER_JOIN,
            } as ConversationMemberJoinEvent;

            spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

            Object.defineProperty(container.resolve(Core), 'clientId', {value: mockSelfClientId});

            jest.spyOn(container.resolve(Core).service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

            const conversationRepo = testFactory.conversation_repository!;
            jest.spyOn(conversationRepo['conversationService'], 'mlsGroupExistsLocally').mockResolvedValue(false);

            return testFactory.conversation_repository['handleConversationEvent'](memberJoinEvent).then(() => {
              expect(testFactory.conversation_repository['onMemberJoin']).toHaveBeenCalled();
              expect(testFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();
            });
          });
        },
      );

      it('should ignore member-join event when accepting a 1to1 conversation', () => {
        const selfUser = generateUser();
        const conversation = _generateConversation({
          id: {id: 'one2one-id', domain: 'one2one-domain'},
          type: CONVERSATION_TYPE.ONE_TO_ONE,
        });

        const memberJoinEvent = {
          conversation: conversation.id,
          data: {
            user_ids: [selfUser.id],
          },
          from: selfUser.id,
          time: '2015-04-27T11:42:31.475Z',
          type: CONVERSATION_EVENT.MEMBER_JOIN,
        } as ConversationMemberJoinEvent;

        const conversationRepo = testFactory.conversation_repository!;
        conversationRepo['conversationState'].conversations.push(conversation);

        // conversation has a corresponding pending connection
        const connectionEntity = new ConnectionEntity();
        connectionEntity.conversationId = conversation.qualifiedId;
        connectionEntity.userId = {domain: '', id: ''};
        connectionEntity.status(ConnectionStatus.PENDING);
        testFactory.connection_repository!.addConnectionEntity(connectionEntity);

        spyOn(conversationRepo!['userState'], 'self').and.returnValue(selfUser);

        return conversationRepo['handleConversationEvent'](memberJoinEvent).then(() => {
          expect(conversationRepo['onMemberJoin']).toHaveBeenCalled();
          expect(conversationRepo.updateParticipatingUserEntities).not.toHaveBeenCalled();
        });
      });

      it('should resolve 1:1 conversation on member-join event', () => {
        const selfUser = generateUser();
        const conversation = _generateConversation({
          id: {id: 'one2one2-id', domain: 'one2one2-domain'},
          type: CONVERSATION_TYPE.ONE_TO_ONE,
        });

        const otherUser = generateUser();

        conversation.participating_user_ids.push(otherUser.qualifiedId);

        const memberJoinEvent = {
          conversation: conversation.id,
          data: {
            user_ids: [selfUser.id],
          },
          from: selfUser.id,
          time: '2015-04-27T11:42:31.475Z',
          type: CONVERSATION_EVENT.MEMBER_JOIN,
        } as ConversationMemberJoinEvent;

        const conversationRepo = testFactory.conversation_repository!;
        const userRepo = testFactory.user_repository!;
        conversationRepo['conversationState'].conversations.push(conversation);

        jest.spyOn(conversationRepo, 'resolve1To1Conversation').mockResolvedValueOnce(conversation);

        jest
          .spyOn(conversationRepo['conversationService'], 'getConversationById')
          .mockResolvedValue(generateAPIConversation({}));

        jest.spyOn(userRepo, 'getUserById').mockResolvedValue(selfUser);

        const connectionEntity = new ConnectionEntity();
        connectionEntity.conversationId = conversation.qualifiedId;
        connectionEntity.userId = otherUser.qualifiedId;
        connectionEntity.status(ConnectionStatus.SENT);
        testFactory.connection_repository!.addConnectionEntity(connectionEntity);

        spyOn(conversationRepo!['userState'], 'self').and.returnValue(selfUser);

        return conversationRepo['handleConversationEvent'](memberJoinEvent).then(() => {
          expect(conversationRepo['onMemberJoin']).toHaveBeenCalled();
          expect(conversationRepo.updateParticipatingUserEntities).toHaveBeenCalled();
          expect(conversationRepo.resolve1To1Conversation).toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-delete', () => {
      let message_et: Message;
      const selfUser = generateUser();

      beforeEach(() => {
        conversation_et = _generateConversation();
        return testFactory.conversation_repository['saveConversation'](conversation_et).then(() => {
          message_et = new Message(createUuid());
          message_et.from = selfUser.id;
          conversation_et.addMessage(message_et);

          spyOn(testFactory.conversation_repository, 'addDeleteMessage');
          spyOn(testFactory.conversation_repository as any, 'onMessageDeleted').and.callThrough();
        });
      });

      afterEach(() => conversation_et.removeMessages());

      it('should not delete message if user is not matching', async () => {
        const message_delete_event: DeleteEvent = createDeleteEvent(message_et.id, conversation_et.id);

        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        await expect(
          testFactory.conversation_repository['handleConversationEvent'](message_delete_event),
        ).rejects.toMatchObject({
          type: ConversationError.TYPE.WRONG_USER,
        });
        expect(testFactory.conversation_repository['onMessageDeleted']).toHaveBeenCalled();
        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
      });

      it('should delete message if user is self', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const message_delete_event: DeleteEvent = {
          conversation: conversation_et.id,
          data: {
            deleted_time: 0,
            message_id: message_et.id,
            time: '',
          },
          from: selfUser.id,
          id: createUuid(),
          qualified_conversation: {domain: '', id: conversation_et.id},
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository['handleConversationEvent'](message_delete_event).then(() => {
          expect(testFactory.conversation_repository['onMessageDeleted']).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
        });
      });

      it('should delete message and add delete message if user is not self', () => {
        spyOn(testFactory.event_service, 'deleteEvent');

        const message_delete_event = createDeleteEvent(message_et.id, conversation_et.id);
        message_et.from = message_delete_event.from;

        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository['handleConversationEvent'](message_delete_event).then(() => {
          expect(testFactory.conversation_repository['onMessageDeleted']).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).toHaveBeenCalled();
        });
      });

      it('should delete message and skip adding delete message for ephemeral messages', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const other_user_id = createUuid();
        message_et.from = other_user_id;
        message_et.ephemeral_expires(true);

        const message_delete_event = createDeleteEvent(message_et.id, conversation_et.id);

        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository['handleConversationEvent'](message_delete_event).then(() => {
          expect(testFactory.conversation_repository['onMessageDeleted']).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-hidden', () => {
      let messageId: string;
      const selfUser = generateUser();

      beforeEach(() => {
        conversation_et = _generateConversation();

        return testFactory.conversation_repository['saveConversation'](conversation_et).then(() => {
          const messageToHideEt = new Message(createUuid());
          conversation_et.addMessage(messageToHideEt);

          messageId = messageToHideEt.id;
          spyOn(testFactory.conversation_repository as any, 'onMessageHidden').and.callThrough();
        });
      });

      it('should not hide message if sender is not self user', async () => {
        const messageHiddenEvent: MessageHiddenEvent = {
          conversation: selfConversation.id,
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: createUuid(),
          id: createUuid(),
          qualified_conversation: selfConversation.qualifiedId,
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        await expect(
          testFactory.conversation_repository['handleConversationEvent'](messageHiddenEvent),
        ).rejects.toMatchObject({
          type: ConversationError.TYPE.WRONG_USER,
        });
        expect(testFactory.conversation_repository['onMessageHidden']).toHaveBeenCalled();
        expect(conversation_et.getMessage(messageId)).toBeDefined();
      });

      it('should hide message if sender is self user', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const messageHiddenEvent: MessageHiddenEvent = {
          conversation: selfConversation.id,
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: selfUser.id,
          id: createUuid(),
          qualified_conversation: selfConversation.qualifiedId,
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository['handleConversationEvent'](messageHiddenEvent).then(() => {
          expect(testFactory.conversation_repository['onMessageHidden']).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
      });

      it('should not hide message if not send via self conversation', async () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const messageHiddenEvent: MessageHiddenEvent = {
          conversation: createUuid(),
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: selfUser.id,
          id: createUuid(),
          qualified_conversation: {domain: '', id: conversation_et.id},
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();
        spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);

        await expect(
          testFactory.conversation_repository['handleConversationEvent'](messageHiddenEvent),
        ).rejects.toMatchObject({
          type: ConversationError.TYPE.WRONG_CONVERSATION,
        });
        expect(testFactory.event_service.deleteEvent).not.toHaveBeenCalled();
      });

      it('syncs message deletion with the database', () => {
        const deletedMessagePayload = {
          conversation: createUuid(),
          from: '',
          id: createUuid(),
          time: '',
          type: CONVERSATION_EVENT.DELETE,
        };

        const conversationEntity = new Conversation();
        spyOn(conversationEntity, 'removeMessageById');

        const conversationRepository = testFactory.conversation_repository;
        spyOn(conversationRepository['conversationState'], 'findConversation').and.returnValue(conversationEntity);

        conversationRepository['deleteLocalMessageEntity']({oldObj: deletedMessagePayload} as any);

        expect(conversationRepository['conversationState'].findConversation).toHaveBeenCalledWith({
          domain: '',
          id: deletedMessagePayload.conversation,
        });
        expect(conversationEntity.removeMessageById).toHaveBeenCalledWith(deletedMessagePayload.id);
      });
    });
  });

  describe('findConversation', () => {
    let conversationRepository: ConversationRepository;
    const conversationIds = ['40b05b5f-d906-4276-902c-3fa16af3b2bd', '3dd5a837-a7a5-40c6-b6c9-b1ab155e1e55'];
    beforeEach(() => {
      conversationRepository = testFactory.conversation_repository;

      const conversationEntities = conversationIds.map(id => new Conversation(id));
      conversationRepository['conversationState'].conversations(conversationEntities);
    });

    afterEach(() => {
      conversationRepository['conversationState'].conversations([]);
    });

    it('does not return any conversation if team is marked for deletion', () => {
      spyOn(conversationRepository['teamState'], 'isTeamDeleted').and.returnValue(false);
      conversationIds.forEach(conversationId => {
        expect(
          conversationRepository['conversationState'].findConversation({domain: '', id: conversationId}),
        ).toBeDefined();
      });

      (conversationRepository['teamState'].isTeamDeleted as any).and.returnValue(true);
      conversationIds.forEach(conversationId => {
        expect(
          conversationRepository['conversationState'].findConversation({domain: '', id: conversationId}),
        ).not.toBeDefined();
      });
    });

    it('returns the conversation if present in the local conversations', () => {
      conversationIds.forEach(conversationId => {
        expect(
          conversationRepository['conversationState'].findConversation({domain: '', id: conversationId}),
        ).toBeDefined();
      });

      const inexistentConversationIds = [
        'f573c44f-c549-4e8f-a4d5-20fdc7adc789',
        'eece4e13-41d4-4ea8-9aa3-383a710a5137',
      ];
      inexistentConversationIds.forEach(conversationId => {
        expect(
          conversationRepository['conversationState'].findConversation({domain: '', id: conversationId}),
        ).not.toBeDefined();
      });
    });
  });

  describe('Encryption', () => {
    let anne: User;
    let bob: User;
    let jane: User;
    let john: User;
    let lara: User;

    beforeEach(() => {
      anne = new User('', null);
      anne.name('Anne');

      bob = new User('532af01e-1e24-4366-aacf-33b67d4ee376', null);
      bob.name('Bob');

      jane = new User(entities.user.jane_roe.id, null);
      jane.name('Jane');

      john = new User(entities.user.john_doe.id, null);
      john.name('John');

      const johns_computer = new ClientEntity(false, null);
      johns_computer.id = '83ad5d3c31d3c76b';
      johns_computer.class = ClientClassification.TABLET;
      john.devices.push(johns_computer);

      lara = new User('', null);
      lara.name('Lara');

      const bobs_computer = new ClientEntity(false, null);
      bobs_computer.id = '74606e4c02b2c7f9';
      bobs_computer.class = ClientClassification.DESKTOP;

      const bobs_phone = new ClientEntity(false, null);
      bobs_phone.id = '8f63631e129ed19d';
      bobs_phone.class = ClientClassification.PHONE;

      bob.devices.push(bobs_computer);
      bob.devices.push(bobs_phone);

      const dudes = _generateConversation();
      dudes.name('Web Dudes');
      dudes.participating_user_ets.push(bob);
      dudes.participating_user_ets.push(john);

      const gals = _generateConversation();
      gals.name('Web Gals');
      gals.participating_user_ets.push(anne);
      gals.participating_user_ets.push(jane);
      gals.participating_user_ets.push(lara);

      const mixed_group = _generateConversation();
      mixed_group.name('Web Dudes & Gals');
      mixed_group.participating_user_ets.push(anne);
      mixed_group.participating_user_ets.push(bob);
      mixed_group.participating_user_ets.push(jane);
      mixed_group.participating_user_ets.push(john);
      mixed_group.participating_user_ets.push(lara);

      return Promise.all([
        testFactory.conversation_repository['saveConversation'](dudes),
        testFactory.conversation_repository['saveConversation'](gals),
        testFactory.conversation_repository['saveConversation'](mixed_group),
      ]);
    });

    it('should know all users participating in a conversation (including the self user)', () => {
      const [, , users] = testFactory.conversation_repository['conversationState'].conversations();
      return testFactory.conversation_repository
        .getAllUsersInConversation({domain: '', id: users.id})
        .then(user_ets => {
          expect(user_ets.length).toBe(3);
          expect(testFactory.conversation_repository['conversationState'].conversations().length).toBe(5);
        });
    });
  });

  describe('addMissingMember', () => {
    it('injects a member-join event if unknown user is detected', () => {
      const conversationId = createUuid();
      const event = {conversation: conversationId, from: 'unknown-user-id'};
      spyOn(testFactory.conversation_repository, 'getConversationById').and.returnValue(Promise.resolve({}));
      spyOn(EventBuilder, 'buildMemberJoin').and.returnValue(event);

      return testFactory.conversation_repository
        .addMissingMember({id: conversationId} as Conversation, [{domain: '', id: 'unknown-user-id'}], 0)
        .then(() => {
          expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(event, EventRepository.SOURCE.INJECTED);
        });
    });
  });

  describe('given a composite message event in a conversation', () => {
    it('when the event is ButtonActionConfirmationEvent from another user, then marks the button as selected', async () => {
      // given
      const selfUser = generateUser();
      const botUserId = generateUser();
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);
      spyOn(testFactory.conversation_repository['eventService'], 'updateEventSequentially').and.returnValue(
        Promise.resolve(),
      );

      const conversationEntity = _generateConversation({type: CONVERSATION_TYPE.GLOBAL_TEAM});

      // Make sure the conversation is in the conversation state
      testFactory.conversation_repository['conversationState'].conversations.push(conversationEntity);

      // Set the self user on the conversation entity (for consistency)
      conversationEntity.selfUser(selfUser);

      const buttonActionConfirmationEvent: ButtonActionConfirmationEvent = {
        conversation: conversationEntity.id,
        data: {
          buttonId: 'button-id',
          messageId: 'message-id',
        },
        from: botUserId.id,
        id: createUuid(),
        qualified_conversation: conversationEntity.qualifiedId,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.BUTTON_ACTION_CONFIRMATION,
      };

      const message = new CompositeMessage(buttonActionConfirmationEvent.data.messageId);
      conversationEntity.addMessage(message);

      expect(message.selectedButtonId()).toBeFalsy();

      // when
      await testFactory.conversation_repository['handleConversationEvent'](buttonActionConfirmationEvent);

      // then - button is selected
      const retrievedMessage = conversationEntity.getMessage(
        buttonActionConfirmationEvent.data.messageId,
      ) as CompositeMessage;
      expect(retrievedMessage.selectedButtonId()).toBe(buttonActionConfirmationEvent.data.buttonId);
    });

    it('when the event is ButtonActionEvent from the self user, then marks the button as selected', async () => {
      // given
      const selfUser = generateUser();
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);
      spyOn(testFactory.conversation_repository['eventService'], 'updateEventSequentially').and.returnValue(
        Promise.resolve(),
      );

      const conversationEntity = _generateConversation({type: CONVERSATION_TYPE.GLOBAL_TEAM});

      // Make sure the conversation is in the conversation state
      testFactory.conversation_repository['conversationState'].conversations.push(conversationEntity);

      // Set the self user on the conversation entity
      conversationEntity.selfUser(selfUser);

      const buttonActionEvent: ButtonActionEvent = {
        conversation: conversationEntity.id,
        data: {
          buttonId: 'button-id',
          messageId: 'message-id',
        },
        from: selfUser.id,
        id: createUuid(),
        qualified_conversation: conversationEntity.qualifiedId,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.BUTTON_ACTION,
      };

      const message = new CompositeMessage(buttonActionEvent.data.messageId);
      conversationEntity.addMessage(message);

      expect(message.selectedButtonId()).toBeFalsy();

      // when
      await testFactory.conversation_repository['handleConversationEvent'](buttonActionEvent);

      // then - button is selected
      const retrievedMessage = conversationEntity.getMessage(buttonActionEvent.data.messageId) as CompositeMessage;
      expect(retrievedMessage.selectedButtonId()).toBe(buttonActionEvent.data.buttonId);
    });

    it('when the event is ButtonActionEvent from another user, then ignores the event and no button is selected', async () => {
      // given
      const selfUser = generateUser();
      const otherUser = generateUser();
      spyOn(testFactory.conversation_repository['userState'], 'self').and.returnValue(selfUser);
      const conversationEntity = _generateConversation({type: CONVERSATION_TYPE.GLOBAL_TEAM});

      const buttonActionEvent: ButtonActionEvent = {
        conversation: conversationEntity.id,
        data: {
          buttonId: 'button-id',
          messageId: 'message-id',
        },
        from: otherUser.id, // Event from another user should be ignored
        id: createUuid(),
        qualified_conversation: conversationEntity.qualifiedId,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.BUTTON_ACTION,
      };

      const message = new CompositeMessage(buttonActionEvent.data.messageId);
      conversationEntity.addMessage(message);

      expect(message.selectedButtonId()).toBeFalsy();

      // when
      await testFactory.conversation_repository['handleConversationEvent'](buttonActionEvent);

      // then - should remain unchanged since the event was from another user
      const retrievedMessage = conversationEntity.getMessage(buttonActionEvent.data.messageId) as CompositeMessage;
      expect(retrievedMessage.selectedButtonId()).toBeFalsy();
    });
  });

  describe('shouldSendReadReceipt', () => {
    it('uses the account preference for 1:1 conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = RECEIPT_MODE.ON;
      testFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generateConversation({type: CONVERSATION_TYPE.ONE_TO_ONE});
      conversationEntity.receiptMode(RECEIPT_MODE.OFF);

      // Verify that the account-level preference wins
      const shouldSend = testFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!preferenceMode);
    });

    it('uses the conversation setting for group conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = RECEIPT_MODE.ON;
      testFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generateConversation();
      conversationEntity.receiptMode(RECEIPT_MODE.OFF);

      // Verify that the conversation-level preference wins
      const shouldSend = testFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!conversationEntity.receiptMode());
    });
  });

  describe('checkForDeletedConversations', () => {
    it('removes conversations that have been deleted on the backend', async () => {
      const deletedGroup = _generateConversation();
      const oldGroup = _generateConversation();
      const conversationRepository = testFactory.conversation_repository!;

      jest.spyOn(testFactory.conversation_service!, 'getConversationByIds').mockResolvedValue({
        not_found: [deletedGroup, oldGroup],
      });
      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockImplementation(async conversationId => {
          if (matchQualifiedIds(conversationId, deletedGroup.qualifiedId)) {
            throw new BackendError('', BackendErrorLabel.NO_CONVERSATION);
          }
          return {} as any;
        });
      await conversationRepository['saveConversation'](deletedGroup);
      await conversationRepository['saveConversation'](oldGroup);

      const currentNbConversations = conversationRepository['conversationState'].conversations().length;
      await testFactory.conversation_repository!.syncDeletedConversations();

      expect(conversationRepository['conversationState'].conversations()).toHaveLength(currentNbConversations - 1);
    });
  });

  function generateConversation(
    id: QualifiedId,
    name: string,
    otherMembers: QualifiedId[] = [],
    protocol = CONVERSATION_PROTOCOL.PROTEUS,
    type = CONVERSATION_TYPE.REGULAR,
  ) {
    return {
      members: {
        others: otherMembers.map(uid => ({qualified_id: uid})) || ([] as any),
        self: {},
      },
      name,
      protocol,
      qualified_id: id,
      receipt_mode: 1,
      team: 'b0dcee1f-c64e-4d40-8b50-5baf932906b8',
      type,
    };
  }

  describe('loadConversations', () => {
    beforeEach(() => {
      testFactory.conversation_repository!['conversationState'].conversations.removeAll();
    });

    it('loads all conversations from backend when there is no local conversations', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const remoteConversations = {
        found: [
          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b',
            },
            'conv1',
          ),

          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-1234-b6cb-602dac89fa1b',
            },
            'conv2',
          ),
        ],
      };
      const localConversations: any = [];

      jest
        .spyOn(conversationService, 'getAllConversations')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);
      jest
        .spyOn(conversationService, 'loadConversationStatesFromDb')
        .mockResolvedValue(localConversations as unknown as ConversationDatabaseData[]);
      jest.spyOn(conversationService, 'saveConversationsInDb').mockImplementation(data => Promise.resolve(data));

      const conversations = await conversationRepository.loadConversations([], []);

      expect(conversations).toHaveLength(remoteConversations.found.length);
    });

    it("does not load proteus 1:1 conversation if there's mls 1:1 conversation with the same user", async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const userId = {id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b', domain: 'staging.zinfra.io'};

      const remoteConversations = {
        found: [
          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b',
            },
            'conv1',
            [userId],
            CONVERSATION_PROTOCOL.PROTEUS,
            CONVERSATION_TYPE.ONE_TO_ONE,
          ),

          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-1234-b6cb-602dac89fa1b',
            },
            'conv2',
            [userId],
            CONVERSATION_PROTOCOL.MLS,
            CONVERSATION_TYPE.ONE_TO_ONE,
          ),
        ],
      };
      const localConversations: any = [];

      jest
        .spyOn(conversationService, 'getAllConversations')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);
      jest
        .spyOn(conversationService, 'loadConversationStatesFromDb')
        .mockResolvedValue(localConversations as unknown as ConversationDatabaseData[]);
      jest.spyOn(conversationService, 'saveConversationsInDb').mockImplementation(data => Promise.resolve(data));

      const conversations = await conversationRepository.loadConversations([], []);

      expect(conversations).toHaveLength(1);
    });

    it("still loads proteus 1:1 conversation if there's mls 1:1 conversation with the same user but conversation exists locally", async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const userId = {id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b', domain: 'staging.zinfra.io'};

      const mls1to1 = generateConversation(
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-1234-b6cb-602dac89fa1b',
        },
        'conv2',
        [userId],
        CONVERSATION_PROTOCOL.MLS,
        CONVERSATION_TYPE.ONE_TO_ONE,
      );

      const proteus1to1 = generateConversation(
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b',
        },
        'conv1',
        [userId],
        CONVERSATION_PROTOCOL.PROTEUS,
        CONVERSATION_TYPE.ONE_TO_ONE,
      );

      const remoteConversations = {
        found: [proteus1to1, mls1to1],
      };
      const localConversations: any = [proteus1to1];

      jest
        .spyOn(conversationService, 'getAllConversations')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);
      jest
        .spyOn(conversationService, 'loadConversationStatesFromDb')
        .mockResolvedValue(localConversations as unknown as ConversationDatabaseData[]);
      jest.spyOn(conversationService, 'saveConversationsInDb').mockImplementation(data => Promise.resolve(data));

      const conversations = await conversationRepository.loadConversations([], []);

      expect(conversations).toHaveLength(remoteConversations.found.length);
    });

    it('does not load connection request (type 3) conversations if their users were deleted on backend', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const userId = {id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b', domain: 'staging.zinfra.io'};

      const connectionReq = generateConversation(
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-1234-b6cb-602dac89fa1b',
        },
        'conv2',
        [userId],
        CONVERSATION_PROTOCOL.PROTEUS,
        CONVERSATION_TYPE.CONNECT,
      );

      const remoteConversations = {
        found: [connectionReq],
      };
      const localConversations: any = [connectionReq];

      jest.spyOn(conversationService, 'deleteConversationFromDb');
      jest.spyOn(conversationService, 'blacklistConversation');
      jest
        .spyOn(conversationService, 'getAllConversations')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);
      jest
        .spyOn(conversationService, 'loadConversationStatesFromDb')
        .mockResolvedValue(localConversations as unknown as ConversationDatabaseData[]);
      jest.spyOn(conversationService, 'saveConversationsInDb').mockImplementation(data => Promise.resolve(data));

      const conversations = await conversationRepository.loadConversations([], []);

      expect(conversations).toHaveLength(0);
      expect(conversationService.deleteConversationFromDb).toHaveBeenCalledWith(connectionReq.qualified_id.id);
      expect(conversationService.blacklistConversation).toHaveBeenCalledWith(connectionReq.qualified_id);
    });

    it('keeps track of missing conversations', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const conversationState = conversationRepository['conversationState'];
      const remoteConversations = {
        found: [
          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b',
            },
            'conv1',
          ),
        ],
        failed: [
          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-1234-b6cb-602dac89fa1b',
            },
            'conv2',
          ),

          generateConversation(
            {
              domain: 'staging.zinfra.io',
              id: '05d0f240-bfe9-5678-b6cb-602dac89fa1b',
            },
            'conv3',
          ),
        ],
      };

      jest
        .spyOn(conversationService, 'getAllConversations')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);

      await conversationRepository.loadConversations([], []);

      expect(conversationState.missingConversations).toHaveLength(remoteConversations.failed.length);
    });
  });
  describe('loadMissingConversations', () => {
    beforeEach(() => {
      testFactory.conversation_repository!['conversationState'].conversations.removeAll();
    });

    it('make sure missing conversations are properly updated', async () => {
      const conversationRepository = testFactory.conversation_repository!;
      const conversationService = conversationRepository['conversationService'];
      const conversationState = conversationRepository['conversationState'];

      const missingConversations = [
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-40d7-b6cb-602dac89fa1b',
        },
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-40d7-1234-602dac89fa1b',
        },
        {
          domain: 'staging.zinfra.io',
          id: '05d0f240-bfe9-40d7-5678-602dac89fa1b',
        },
      ];

      const remoteConversations = {
        found: [generateConversation(missingConversations[0], 'conv1')],
        failed: [
          generateConversation(missingConversations[1], 'conv2').qualified_id,
          generateConversation(missingConversations[2], 'conv3').qualified_id,
        ],
      };

      jest.replaceProperty(conversationState, 'missingConversations', missingConversations as any);
      jest
        .spyOn(conversationService, 'getConversationByIds')
        .mockResolvedValue(remoteConversations as unknown as RemoteConversations);

      expect(conversationState.missingConversations).toHaveLength(missingConversations.length);

      await conversationRepository.loadMissingConversations();

      expect(conversationState.missingConversations).toHaveLength(remoteConversations.failed.length);
    });
  });

  describe('refreshUnavailableParticipants', () => {
    it('should refresh unavailable users', async () => {
      const conversation = _generateConversation();
      const unavailableUsers = [generateUser(), generateUser(), generateUser()].map(user => {
        user.id = '';
        user.name('');
        return user;
      });

      conversation.participating_user_ets.push(unavailableUsers[0], unavailableUsers[1], unavailableUsers[2]);

      const conversationRepo = await testFactory.exposeConversationActors();
      spyOn(testFactory.user_repository!, 'refreshUsers').and.callFake(() => {
        unavailableUsers.map(user => {
          user.id = createUuid();
          user.name(faker.person.fullName());
        });
      });

      await conversationRepo.refreshUnavailableParticipants(conversation);

      expect(testFactory.user_repository!.refreshUsers).toHaveBeenCalled();
      expect(unavailableUsers[0].name).toBeTruthy();
      expect(unavailableUsers[1].name).toBeTruthy();
      expect(unavailableUsers[2].name).toBeTruthy();
    });
  });

  describe('refreshAllConversationsUnavailableParticipants', () => {
    it('should refresh all unavailable users & conversations', async () => {
      const conversation1 = _generateConversation();
      const conversation2 = _generateConversation();
      const unavailableUsers1 = [generateUser(), generateUser(), generateUser()].map(user => {
        user.id = '';
        user.name('');
        return user;
      });
      const unavailableUsers2 = [generateUser(), generateUser(), generateUser()].map(user => {
        user.id = '';
        user.name('');
        return user;
      });

      conversation1.participating_user_ets.push(unavailableUsers1[0], unavailableUsers1[1], unavailableUsers1[2]);
      conversation2.participating_user_ets.push(unavailableUsers2[0], unavailableUsers2[1], unavailableUsers2[2]);

      const conversationRepo = await testFactory.exposeConversationActors();
      testFactory.conversation_repository!['conversationState'].conversations([conversation1, conversation2]);

      spyOn(testFactory.user_repository!, 'refreshUsers').and.callFake(() => {
        unavailableUsers1.map(user => {
          user.id = createUuid();
          user.name(faker.person.fullName());
        });
        unavailableUsers2.map(user => {
          user.id = createUuid();
          user.name(faker.person.fullName());
        });
      });

      await conversationRepo['refreshAllConversationsUnavailableParticipants']();

      expect(testFactory.user_repository!.refreshUsers).toHaveBeenCalled();
      expect(unavailableUsers1[0].name).toBeTruthy();
      expect(unavailableUsers1[1].name).toBeTruthy();
      expect(unavailableUsers1[2].name).toBeTruthy();
      expect(unavailableUsers2[0].name).toBeTruthy();
      expect(unavailableUsers2[1].name).toBeTruthy();
      expect(unavailableUsers2[2].name).toBeTruthy();
    });
  });

  describe('scheduleMissingUsersAndConversationsMetadataRefresh', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should not call loadMissingConversations & refreshAllConversationsUnavailableParticipants for non federated envs', async () => {
      const conversationRepo = await testFactory.exposeConversationActors();

      spyOn(conversationRepo, 'loadMissingConversations').and.callThrough();
      spyOn(
        conversationRepo,
        'refreshAllConversationsUnavailableParticipants' as keyof ConversationRepository,
      ).and.callThrough();

      expect(conversationRepo.loadMissingConversations).not.toHaveBeenCalled();
      expect(conversationRepo['refreshAllConversationsUnavailableParticipants']).not.toHaveBeenCalled();
    });

    it('should call loadMissingConversations & refreshAllConversationsUnavailableParticipants every 3 hours for federated envs', async () => {
      Object.defineProperty(container.resolve(Core).backendFeatures, 'isFederated', {
        get: jest.fn(() => true),
        configurable: true,
      });
      const conversationRepo = await testFactory.exposeConversationActors();

      spyOn(conversationRepo, 'loadMissingConversations').and.callThrough();
      spyOn(
        conversationRepo,
        'refreshAllConversationsUnavailableParticipants' as keyof ConversationRepository,
      ).and.callThrough();

      jest.advanceTimersByTime(3600000 * 4);

      await Promise.resolve();

      expect(conversationRepo.loadMissingConversations).toHaveBeenCalled();
      expect(conversationRepo['refreshAllConversationsUnavailableParticipants']).toHaveBeenCalled();
    });
  });

  describe('updateConversationProtocol', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update the protocol-related fields after protocol was updated to mixed and inject event', async () => {
      const conversation = _generateConversation();
      const conversationRepository = await testFactory.exposeConversationActors();

      const mockedProtocolUpdateEventResponse = {
        data: {
          protocol: CONVERSATION_PROTOCOL.MIXED,
        },
        qualified_conversation: {
          domain: 'anta.wire.link',
          id: 'fb1c0e0f-60a9-4a6c-9644-041260e7aac9',
        },
        time: '2020-10-13T14:00:00.000Z',
        type: CONVERSATION_EVENT.PROTOCOL_UPDATE,
      } as ConversationProtocolUpdateEvent;

      jest
        .spyOn(conversationRepository['conversationService'], 'saveConversationStateInDb')
        .mockResolvedValue({} as any);
      jest
        .spyOn(conversationRepository['conversationService'], 'updateConversationProtocol')
        .mockResolvedValueOnce(mockedProtocolUpdateEventResponse);

      const newProtocol = CONVERSATION_PROTOCOL.MIXED;
      const newCipherSuite = 1;
      const newEpoch = 2;
      const mockedConversationResponse = generateAPIConversation({
        protocol: newProtocol,
        overwites: {cipher_suite: newCipherSuite, epoch: newEpoch},
      });

      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(mockedConversationResponse);

      const injectEventSpy = jest
        .spyOn(conversationRepository['eventRepository'], 'injectEvent')
        .mockResolvedValueOnce(undefined);

      const updatedConversation = await conversationRepository.updateConversationProtocol(
        conversation,
        CONVERSATION_PROTOCOL.MIXED,
      );

      expect(injectEventSpy).toHaveBeenCalledWith(
        mockedProtocolUpdateEventResponse,
        EventRepository.SOURCE.BACKEND_RESPONSE,
      );

      expect(updatedConversation.protocol).toEqual(CONVERSATION_PROTOCOL.MIXED);
      expect(updatedConversation.cipherSuite).toEqual(newCipherSuite);
      expect(updatedConversation.epoch).toEqual(newEpoch);
    });

    it('should inject a system message if conversation protocol changed to mls during a call', async () => {
      jest.useFakeTimers();
      const conversation = _generateConversation();
      const selfUser = generateUser();
      conversation.selfUser(selfUser);
      const conversationRepository = await testFactory.exposeConversationActors();
      const newProtocol = CONVERSATION_PROTOCOL.MLS;

      const mockedProtocolUpdateEventResponse = {
        data: {
          protocol: newProtocol,
        },
        qualified_conversation: conversation.qualifiedId,
        time: '2020-10-13T14:00:00.000Z',
        type: CONVERSATION_EVENT.PROTOCOL_UPDATE,
      } as ConversationProtocolUpdateEvent;

      jest
        .spyOn(conversationRepository['conversationService'], 'saveConversationStateInDb')
        .mockResolvedValue({} as any);
      jest
        .spyOn(conversationRepository['conversationService'], 'updateConversationProtocol')
        .mockResolvedValueOnce(mockedProtocolUpdateEventResponse);

      const newCipherSuite = 1;
      const newEpoch = 2;
      const mockedConversationResponse = generateAPIConversation({
        protocol: newProtocol,
        overwites: {cipher_suite: newCipherSuite, epoch: newEpoch},
      });
      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(mockedConversationResponse);

      const injectEventMock = jest
        .spyOn(conversationRepository['eventRepository'], 'injectEvent')
        .mockImplementation(jest.fn());
      jest
        .spyOn(conversationRepository['callingRepository'], 'findCall')
        .mockReturnValue({isActive: () => true} as any);

      await conversationRepository.updateConversationProtocol(conversation, newProtocol);

      expect(injectEventMock.mock.calls).toEqual([
        [mockedProtocolUpdateEventResponse, EventRepository.SOURCE.BACKEND_RESPONSE],
        [expect.objectContaining({type: ClientEvent.CONVERSATION.MLS_MIGRATION_ONGOING_CALL})],
      ]);
    });

    it("should NOT inject a system message if conversation protocol changed to mls if we're not atively participating in a call", async () => {
      jest.useFakeTimers();
      const conversation = _generateConversation();
      const selfUser = generateUser();
      conversation.selfUser(selfUser);
      const conversationRepository = await testFactory.exposeConversationActors();
      const newProtocol = CONVERSATION_PROTOCOL.MLS;

      const mockedProtocolUpdateEventResponse = {
        data: {
          protocol: newProtocol,
        },
        qualified_conversation: conversation.qualifiedId,
        time: '2020-10-13T14:00:00.000Z',
        type: CONVERSATION_EVENT.PROTOCOL_UPDATE,
      } as ConversationProtocolUpdateEvent;

      jest
        .spyOn(conversationRepository['conversationService'], 'saveConversationStateInDb')
        .mockResolvedValue({} as any);
      jest
        .spyOn(conversationRepository['conversationService'], 'updateConversationProtocol')
        .mockResolvedValueOnce(mockedProtocolUpdateEventResponse);

      const newCipherSuite = 1;
      const newEpoch = 2;
      const mockedConversationResponse = generateAPIConversation({
        protocol: newProtocol,
        overwites: {cipher_suite: newCipherSuite, epoch: newEpoch},
      });
      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(mockedConversationResponse);

      const injectEventMock = jest
        .spyOn(conversationRepository['eventRepository'], 'injectEvent')
        .mockImplementation(jest.fn());
      jest
        .spyOn(conversationRepository['callingRepository'], 'findCall')
        .mockReturnValue({isActive: () => false} as any);

      await conversationRepository.updateConversationProtocol(conversation, newProtocol);

      expect(injectEventMock).toHaveBeenCalledWith(
        mockedProtocolUpdateEventResponse,
        EventRepository.SOURCE.BACKEND_RESPONSE,
      );

      expect(injectEventMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('addUsers', () => {
    it('should add users to proteus conversation', async () => {
      const conversation = _generateConversation();
      const conversationRepository = await testFactory.exposeConversationActors();

      const usersToAdd = [generateUser(), generateUser()];

      const coreConversationService = container.resolve(Core).service!.conversation;
      spyOn(coreConversationService, 'addUsersToProteusConversation');

      await conversationRepository.addUsers(conversation, usersToAdd);
      expect(coreConversationService.addUsersToProteusConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        qualifiedUsers: usersToAdd.map(user => user.qualifiedId),
      });
    });

    it('should add users to mls group of mixed conversation', async () => {
      const mockedGroupId = `mockedGroupId`;
      const conversation = _generateConversation({
        protocol: CONVERSATION_PROTOCOL.MIXED,
        groupId: mockedGroupId,
      });
      const conversationRepository = await testFactory.exposeConversationActors();

      const usersToAdd = [generateUser(), generateUser()];

      const coreConversationService = container.resolve(Core).service!.conversation;
      jest.spyOn(coreConversationService, 'addUsersToMLSConversation');
      jest.spyOn(coreConversationService, 'addUsersToProteusConversation').mockResolvedValueOnce({});

      await conversationRepository.addUsers(conversation, usersToAdd);
      expect(coreConversationService.addUsersToProteusConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        qualifiedUsers: usersToAdd.map(user => user.qualifiedId),
      });
      expect(coreConversationService.addUsersToMLSConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        qualifiedUsers: usersToAdd.map(user => user.qualifiedId),
        groupId: mockedGroupId,
      });
    });

    it('should add users to mls group of mls conversation', async () => {
      const mockedGroupId = `mockedGroupId`;
      const conversation = _generateConversation({protocol: CONVERSATION_PROTOCOL.MLS, groupId: mockedGroupId});
      const conversationRepository = await testFactory.exposeConversationActors();

      const usersToAdd = [generateUser(), generateUser()];

      const coreConversationService = container.resolve(Core).service!.conversation;
      spyOn(coreConversationService, 'addUsersToMLSConversation');

      await conversationRepository.addUsers(conversation, usersToAdd);
      expect(coreConversationService.addUsersToMLSConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        qualifiedUsers: usersToAdd.map(user => user.qualifiedId),
        groupId: mockedGroupId,
      });
    });
  });

  describe('removeMembers', () => {
    it.each([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MIXED])(
      'should remove member from %s conversation',
      async protocol => {
        const conversationRepository = await testFactory.exposeConversationActors();

        const conversation = _generateConversation({protocol});

        const selfUser = generateUser();
        conversation.selfUser(selfUser);

        const user1 = generateUser();
        const user2 = generateUser();

        conversation.participating_user_ets([user1, user2]);

        const coreConversationService = container.resolve(Core).service!.conversation;

        jest.spyOn(conversationRepository['eventRepository'], 'injectEvent').mockImplementation(jest.fn());

        await conversationRepository.removeMembers(conversation, [user1.qualifiedId]);

        expect(coreConversationService.removeUserFromConversation).toHaveBeenCalledWith(
          conversation.qualifiedId,
          user1.qualifiedId,
        );
      },
    );

    it('should remove member from mls conversation', async () => {
      const conversationRepository = await testFactory.exposeConversationActors();

      const conversation = _generateConversation({protocol: CONVERSATION_PROTOCOL.MLS});

      const selfUser = generateUser();
      conversation.selfUser(selfUser);

      const user1 = generateUser();
      const user2 = generateUser();

      conversation.participating_user_ets([user1, user2]);

      const coreConversationService = container.resolve(Core).service!.conversation;

      jest
        .spyOn(coreConversationService, 'removeUsersFromMLSConversation')
        .mockResolvedValueOnce({} as BackendConversation);
      jest.spyOn(conversationRepository['eventRepository'], 'injectEvent').mockImplementation(jest.fn());

      jest
        .spyOn(coreConversationService, 'removeUsersFromMLSConversation')
        .mockResolvedValueOnce({} as BackendConversation);
      await conversationRepository.removeMembers(conversation, [user1.qualifiedId]);

      expect(coreConversationService.removeUsersFromMLSConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        qualifiedUserIds: [user1.qualifiedId],
        groupId: conversation.groupId,
      });
    });
  });

  describe('fetchBackendConversationEntityById', () => {
    it('returns backend conversation entity on success', async () => {
      const conversationRepository = await testFactory.exposeConversationActors();
      const qualifiedId = {id: 'test-id', domain: 'test-domain'};
      const backendConversation = generateAPIConversation({id: qualifiedId});

      jest
        .spyOn(conversationRepository['conversationService'], 'getConversationById')
        .mockResolvedValueOnce(backendConversation);

      const result = await conversationRepository.fetchBackendConversationEntityById(qualifiedId);
      expect(result).toBe(backendConversation);
    });

    it('throws and logs error when backend call fails', async () => {
      const conversationRepository = await testFactory.exposeConversationActors();
      const qualifiedId = {id: 'test-id', domain: 'test-domain'};
      const error = new Error('Backend error');

      jest.spyOn(conversationRepository['conversationService'], 'getConversationById').mockRejectedValueOnce(error);

      const loggerSpy = jest.spyOn(conversationRepository['logger'], 'error').mockImplementation(() => {});

      await expect(conversationRepository.fetchBackendConversationEntityById(qualifiedId)).rejects.toThrow(error);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to get conversation from backend'));
    });
  });
});

describe('leaveConversation', () => {
  it.each([CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MIXED, CONVERSATION_PROTOCOL.MLS])(
    'should leave %s conversation',
    async protocol => {
      const [conversationRepository, {userState, core, eventRepository}] = buildConversationRepository();

      const conversation = _generateConversation({protocol});

      const selfUser = generateUser();
      conversation.selfUser(selfUser);

      userState.self(selfUser);

      conversation.participating_user_ets([generateUser(), generateUser()]);

      const removeUserFromConversationSpy = jest.spyOn(core.service!.conversation, 'removeUserFromConversation');

      const injectEventsSpy = jest.spyOn(eventRepository, 'injectEvents');

      await conversationRepository.leaveConversation(conversation);

      expect(removeUserFromConversationSpy).toHaveBeenCalledWith(conversation.qualifiedId, selfUser.qualifiedId);
      expect(injectEventsSpy).toHaveBeenCalled();
    },
  );
});

describe('deleteConversation', () => {
  it('should delete conversation on backend and locally', async () => {
    const [conversationRepository, {teamState, conversationState, conversationService}] = buildConversationRepository();
    const teamId = createUuid();

    teamState.team({id: teamId} as any);
    const conversation = _generateConversation({protocol: CONVERSATION_PROTOCOL.MLS});

    const deleteConversationSpy = jest.spyOn(conversationService, 'deleteConversation');
    const deleteConversationFromDbSpy = jest.spyOn(conversationService, 'deleteConversationFromDb');
    const wipeMLSCapableConversationSpy = jest.spyOn(conversationService, 'wipeMLSCapableConversation');

    conversationState.conversations([conversation]);
    await conversationRepository.deleteConversation(conversation);

    expect(deleteConversationSpy).toHaveBeenCalledWith(teamId, conversation.id);

    expect(conversationState.conversations()).toEqual([]);
    expect(deleteConversationFromDbSpy).toHaveBeenCalledWith(conversation.id);
    expect(wipeMLSCapableConversationSpy).toHaveBeenCalledWith(conversation);
  });

  it('should still delete conversation locally if it is deleted on backend already', async () => {
    const [conversationRepository, {conversationState, conversationService}] = buildConversationRepository();
    const teamId = createUuid();

    jest.spyOn(conversationRepository['teamState'], 'team').mockReturnValue({id: teamId} as any);

    const conversation = _generateConversation({protocol: CONVERSATION_PROTOCOL.MLS});

    const deleteConversationSpy = jest
      .spyOn(conversationService, 'deleteConversation')
      .mockRejectedValueOnce(new BackendError('Conversation not found', BackendErrorLabel.NO_CONVERSATION));

    const deleteConversationFromDbSpy = jest
      .spyOn(conversationService, 'deleteConversationFromDb')
      .mockReturnValue(undefined as any);
    const wipeMLSCapableConversationSpy = jest.spyOn(conversationService, 'wipeMLSCapableConversation');

    conversationState.conversations([conversation]);
    await conversationRepository.deleteConversation(conversation);

    expect(deleteConversationSpy).toHaveBeenCalledWith(teamId, conversation.id);

    expect(conversationState.conversations()).toEqual([]);
    expect(deleteConversationFromDbSpy).toHaveBeenCalledWith(conversation.id);
    expect(wipeMLSCapableConversationSpy).toHaveBeenCalledWith(conversation);
  });
});
