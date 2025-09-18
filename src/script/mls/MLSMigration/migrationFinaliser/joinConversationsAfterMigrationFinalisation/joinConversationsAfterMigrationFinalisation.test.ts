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

import {ConversationDatabaseData, ConversationMapper} from 'Repositories/conversation/ConversationMapper';
import {User} from 'Repositories/entity/User';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {joinConversationsAfterMigrationFinalisation} from '.';

const createMockedDBConversationEntry = (
  id: string,
  domain: string,
  initialProtocol: ConversationProtocol,
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
  initial_protocol: initialProtocol,
  is_guest: false,
  last_event_timestamp: 1688640266515,
  last_read_timestamp: 1688640266515,
  last_server_timestamp: 1688640266515,
  legal_hold_status: 1,
  muted_state: 0,
  muted_timestamp: 0,
  name: 'siema siema',
  others: ['5cb88781-164d-4d9f-94e2-87294fb4d63c'],
  protocol,
  readonly_state: null,
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
  mlsVerificationState: 0,
});

const createConversation = (
  id: string,
  domain: string,
  initialProtocol: ConversationProtocol,
  protocol: ConversationProtocol,
  type: CONVERSATION_TYPE,
  selfUser: User,
  groupId?: string,
) => {
  const conversationRecord = createMockedDBConversationEntry(id, domain, initialProtocol, protocol, type);

  const [conversation] = ConversationMapper.mapConversations([conversationRecord]);
  conversation.type(type);

  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = groupId;
  }

  conversation.selfUser(selfUser);

  return conversation;
};

describe('joinConversationsAfterMigrationFinalisation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should join MLS groups of group conversations and call onSuccess callback after successful join', async () => {
    const mockCore = container.resolve(Core);

    jest.spyOn(mockCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const mockedConversation = createConversation(
      conversationId,
      mockDomain,
      ConversationProtocol.PROTEUS,
      ConversationProtocol.MLS,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      conversationGroupId,
    );

    const onSuccess = jest.fn();

    await joinConversationsAfterMigrationFinalisation({
      conversations: [mockedConversation],
      selfUser,
      core: mockCore,
      onSuccess,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).toHaveBeenCalledWith({
      domain: mockDomain,
      id: conversationId,
    });

    expect(onSuccess).toHaveBeenCalledWith(mockedConversation);
  });

  it('Should ignore other type of conversations (e.g. 1:1)', async () => {
    const mockCore = container.resolve(Core);

    jest.spyOn(mockCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const mockedConversations = createConversation(
      conversationId,
      mockDomain,
      ConversationProtocol.PROTEUS,
      ConversationProtocol.MLS,
      CONVERSATION_TYPE.ONE_TO_ONE,
      selfUser,
      conversationGroupId,
    );

    const onSuccess = jest.fn();

    await joinConversationsAfterMigrationFinalisation({
      conversations: [mockedConversations],
      selfUser,
      core: mockCore,
      onSuccess,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('Should not join MLS conversation that was already MLS in the store', async () => {
    const mockCore = container.resolve(Core);

    jest.spyOn(mockCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const mockedConversation = createConversation(
      conversationId,
      mockDomain,
      ConversationProtocol.MLS,
      ConversationProtocol.MLS,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      conversationGroupId,
    );

    const onSuccess = jest.fn();

    await joinConversationsAfterMigrationFinalisation({
      conversations: [mockedConversation],
      selfUser,
      core: mockCore,
      onSuccess,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('Should not join MLS conversation if conversation was not migrated', async () => {
    const mockCore = container.resolve(Core);

    jest.spyOn(mockCore.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);

    const conversationId = 'conversation1';
    const mockDomain = 'anta.wire.link';
    const conversationGroupId = 'groupId1';
    const selfUser = new User(createUuid());

    const mockedConversation = createConversation(
      conversationId,
      mockDomain,
      ConversationProtocol.PROTEUS,
      ConversationProtocol.PROTEUS,
      CONVERSATION_TYPE.REGULAR,
      selfUser,
      conversationGroupId,
    );

    const onSuccess = jest.fn();

    await joinConversationsAfterMigrationFinalisation({
      conversations: [mockedConversation],
      selfUser,
      core: mockCore,
      onSuccess,
    });

    expect(mockCore.service?.conversation.joinByExternalCommit).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
