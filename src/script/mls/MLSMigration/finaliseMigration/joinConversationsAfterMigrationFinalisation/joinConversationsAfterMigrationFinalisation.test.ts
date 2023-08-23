/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {
  ConversationProtocol,
  CONVERSATION_TYPE,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
} from '@wireapp/api-client/lib/conversation';
import {container} from 'tsyringe';

import {ConversationDatabaseData} from 'src/script/conversation/ConversationMapper';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {CONVERSATION} from 'src/script/event/Client';
import {Core} from 'src/script/service/CoreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {joinConversationsAfterMigrationFinalisation} from './';

const createMockedDBConversationEntry = (
  id: string,
  domain: string,
  protocol: ConversationProtocol,
  type: CONVERSATION_TYPE,
): ConversationDatabaseData => ({
  access: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
  access_role: [
    CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
    CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
    CONVERSATION_ACCESS_ROLE.GUEST,
    CONVERSATION_ACCESS_ROLE.SERVICE,
  ],
  accessRole: [
    CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
    CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
    CONVERSATION_ACCESS_ROLE.GUEST,
    CONVERSATION_ACCESS_ROLE.SERVICE,
  ],
  archived_state: false,
  archived_timestamp: 0,
  cipher_suite: 1,
  cleared_timestamp: 0,
  creator: 'ab10dc82-4846-4200-aee4-13254cdde9aa',
  domain,
  ephemeral_timer: 0,
  epoch: 3,
  global_message_timer: 0,
  group_id: 'AAEAAGzYgfBo4k5Eti33a4ZZ78cAYW50YS53aXJlLmxpbms=',
  id,
  is_guest: false,
  is_managed: false,
  last_event_timestamp: 1688640266515,
  last_read_timestamp: 1688640266515,
  last_server_timestamp: 1688640266515,
  legal_hold_status: 1,
  muted_state: 0,
  muted_timestamp: 0,
  name: 'siema siema',
  others: ['5cb88781-164d-4d9f-94e2-87294fb4d63c'],
  protocol,
  qualified_others: [
    {
      domain: 'anta.wire.link',
      id: '5cb88781-164d-4d9f-94e2-87294fb4d63c',
    },
  ],
  receipt_mode: 1,
  roles: {
    'ab10dc82-4846-4200-aee4-13254cdde9aa': 'wire_admin',
    '5cb88781-164d-4d9f-94e2-87294fb4d63c': 'wire_member',
  },
  status: 0,
  team_id: 'b87a286f-8416-4a7c-a061-ba697963d9f4',
  type,
  verification_state: 0,
  accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
  message_timer: 0,
});

const createConversation = (
  id: string,
  domain: string,
  protocol: ConversationProtocol,
  type: CONVERSATION_TYPE,
  selfUser: User,
  groupId?: string,
) => {
  const conversation = new Conversation(id, domain, protocol);
  conversation.type(type);

  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = groupId;
  }

  conversation.selfUser(selfUser);

  return conversation;
};

const createdMigratedConversationEntities = (
  id: string,
  domain: string,
  type: CONVERSATION_TYPE,
  selfUser: User,
  protocols: {localStore: ConversationProtocol; backend: ConversationProtocol},
  groupId?: string,
) => {
  return {
    conversationDatabaseData: createMockedDBConversationEntry(id, domain, protocols.localStore, type),
    updatedConversation: createConversation(id, domain, protocols.backend, type, selfUser, groupId),
  };
};

const testFactory = new TestFactory();

describe('joinConversationsAfterMigrationFinalisation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should join MLS groups of group conversations and insert a system message when joining after conversations were already migrated', async () => {
    const mockCore = container.resolve(Core);
    const conversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.conversation, 'isMLSConversationEstablished').mockResolvedValue(false);
    jest.spyOn(conversationRepository['eventRepository'], 'injectEvent');

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const {updatedConversation, conversationDatabaseData} = createdMigratedConversationEntities(
      conversationId,
      mockDomain,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      {
        localStore: ConversationProtocol.PROTEUS,
        backend: ConversationProtocol.MLS,
      },
      conversationGroupId,
    );

    await joinConversationsAfterMigrationFinalisation({
      updatedConversations: [updatedConversation],
      initialDatabaseConversations: [conversationDatabaseData],
      core: mockCore,
      conversationRepository,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).toHaveBeenCalledWith({
      domain: mockDomain,
      id: conversationId,
    });

    expect(conversationRepository['eventRepository'].injectEvent).toHaveBeenCalledWith({
      conversation: conversationId,
      qualified_conversation: {domain: mockDomain, id: conversationId},
      from: selfUser.id,
      id: expect.any(String),
      data: null,
      time: expect.any(String),
      type: CONVERSATION.JOINED_AFTER_MLS_MIGRATION_FINALISATION,
    });
  });

  it('Should ignore other type of conversations (e.g. 1:1)', async () => {
    const mockCore = container.resolve(Core);
    const conversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.conversation, 'isMLSConversationEstablished').mockResolvedValue(false);
    jest.spyOn(conversationRepository['eventRepository'], 'injectEvent');

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const {updatedConversation, conversationDatabaseData} = createdMigratedConversationEntities(
      conversationId,
      mockDomain,
      CONVERSATION_TYPE.ONE_TO_ONE,
      selfUser,
      {
        localStore: ConversationProtocol.PROTEUS,
        backend: ConversationProtocol.MLS,
      },
      conversationGroupId,
    );

    await joinConversationsAfterMigrationFinalisation({
      updatedConversations: [updatedConversation],
      initialDatabaseConversations: [conversationDatabaseData],
      core: mockCore,
      conversationRepository,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(conversationRepository['eventRepository'].injectEvent).not.toHaveBeenCalled();
  });

  it('Should not join MLS conversation that was already MLS in the store', async () => {
    const mockCore = container.resolve(Core);
    const conversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.conversation, 'isMLSConversationEstablished').mockResolvedValue(false);
    jest.spyOn(conversationRepository['eventRepository'], 'injectEvent');

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const {updatedConversation, conversationDatabaseData} = createdMigratedConversationEntities(
      conversationId,
      mockDomain,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      {
        localStore: ConversationProtocol.MLS,
        backend: ConversationProtocol.MLS,
      },
      conversationGroupId,
    );

    await joinConversationsAfterMigrationFinalisation({
      updatedConversations: [updatedConversation],
      initialDatabaseConversations: [conversationDatabaseData],
      core: mockCore,
      conversationRepository,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(conversationRepository['eventRepository'].injectEvent).not.toHaveBeenCalled();
  });

  it('Should not join MLS conversation if conversation was not in the store before', async () => {
    const mockCore = container.resolve(Core);
    const conversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.conversation, 'isMLSConversationEstablished').mockResolvedValue(false);
    jest.spyOn(conversationRepository['eventRepository'], 'injectEvent');

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const {updatedConversation} = createdMigratedConversationEntities(
      conversationId,
      mockDomain,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      {
        localStore: ConversationProtocol.PROTEUS,
        backend: ConversationProtocol.MLS,
      },
      conversationGroupId,
    );

    await joinConversationsAfterMigrationFinalisation({
      updatedConversations: [updatedConversation],
      initialDatabaseConversations: [],
      core: mockCore,
      conversationRepository,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(conversationRepository['eventRepository'].injectEvent).not.toHaveBeenCalled();
  });

  it('Should not join MLS conversation if conversation was not migrated', async () => {
    const mockCore = container.resolve(Core);
    const conversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.conversation, 'isMLSConversationEstablished').mockResolvedValue(false);
    jest.spyOn(conversationRepository['eventRepository'], 'injectEvent');

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const {updatedConversation, conversationDatabaseData} = createdMigratedConversationEntities(
      conversationId,
      mockDomain,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      {
        localStore: ConversationProtocol.PROTEUS,
        backend: ConversationProtocol.PROTEUS,
      },
      conversationGroupId,
    );

    await joinConversationsAfterMigrationFinalisation({
      updatedConversations: [updatedConversation],
      initialDatabaseConversations: [conversationDatabaseData],
      core: mockCore,
      conversationRepository,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(conversationRepository['eventRepository'].injectEvent).not.toHaveBeenCalled();
  });
});
