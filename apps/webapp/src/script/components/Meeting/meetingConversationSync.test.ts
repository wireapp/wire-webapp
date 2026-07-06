/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task} from 'true-myth';

import {Conversation} from 'Repositories/entity/Conversation';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {
  meetingConversationSyncErrors,
  syncMeetingConversationParticipants,
} from './meetingConversationSync';

const qualifiedConversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};
const groupId = 'group-id';

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const createConversation = (epoch = 0) => {
  const conversation = new Conversation(
    qualifiedConversationId.id,
    qualifiedConversationId.domain,
    CONVERSATION_PROTOCOL.MLS,
    translateForTest,
  );
  conversation.groupId = groupId;
  conversation.epoch = epoch;
  return conversation;
};

describe('syncMeetingConversationParticipants', () => {
  const createRepository = ({
    conversation = createConversation(),
    establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    safeRemoveMembers = jest.fn().mockReturnValue(task.resolve(undefined)),
    safeGetConversationById = jest.fn().mockReturnValue(task.resolve(conversation)),
  }: {
    conversation?: Conversation;
    establishMeetingConversation?: jest.Mock;
    safeAddUsers?: jest.Mock;
    safeRemoveMembers?: jest.Mock;
    safeGetConversationById?: jest.Mock;
  } = {}) =>
    ({
      safeGetConversationById,
      establishMeetingConversation,
      safeAddUsers,
      safeRemoveMembers,
    }) as unknown as ConversationRepository;

  it('establishes the meeting conversation on create even with zero participants', async () => {
    const establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const conversationRepository = createRepository({establishMeetingConversation, safeAddUsers});

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [],
      usersToAdd: [],
      userIdsToRemove: [],
      isCreate: true,
    });

    expect(result.isOk).toBe(true);
    expect(establishMeetingConversation).toHaveBeenCalledWith({
      groupId,
      userIdsToAdd: [],
      conversationQualifiedId: qualifiedConversationId,
    });
    expect(safeAddUsers).not.toHaveBeenCalled();
  });

  it('establishes with selected users on create without calling safeAddUsers', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const conversationRepository = createRepository({establishMeetingConversation, safeAddUsers});

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [alice, bob],
      usersToAdd: [alice, bob],
      userIdsToRemove: [],
      isCreate: true,
    });

    expect(result.isOk).toBe(true);
    expect(establishMeetingConversation).toHaveBeenCalledWith({
      groupId,
      userIdsToAdd: [alice.qualifiedId, bob.qualifiedId],
      conversationQualifiedId: qualifiedConversationId,
    });
    expect(safeAddUsers).not.toHaveBeenCalled();
  });

  it('returns partial failedToAdd from establish on create', async () => {
    const alice = createUser('1');
    const failedToAdd = [{users: [alice.qualifiedId], backends: [], reason: 'UNREACHABLE_BACKENDS'}];
    const conversationRepository = createRepository({
      establishMeetingConversation: jest.fn().mockReturnValue(task.resolve({failedToAdd})),
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [alice],
      usersToAdd: [alice],
      userIdsToRemove: [],
      isCreate: true,
    });

    expect(result.isOk).toBe(true);
    expect(result.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual(failedToAdd);
  });

  it('adds members before removing on update', async () => {
    const alice = createUser('1');
    const charlie = createUser('3');
    const establishedConversation = createConversation(1);
    const safeRemoveMembers = jest.fn().mockReturnValue(task.resolve(undefined));
    const safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const conversationRepository = createRepository({
      conversation: establishedConversation,
      safeRemoveMembers,
      safeAddUsers,
      establishMeetingConversation,
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [charlie],
      usersToAdd: [charlie],
      userIdsToRemove: [alice.qualifiedId],
      isCreate: false,
    });

    expect(result.isOk).toBe(true);
    expect(safeAddUsers).toHaveBeenCalledWith(establishedConversation, [charlie]);
    expect(safeRemoveMembers).toHaveBeenCalledWith(establishedConversation, [alice.qualifiedId]);
    expect(establishMeetingConversation).not.toHaveBeenCalled();
  });

  it('adds users via safeAddUsers on update without establishing the conversation', async () => {
    const charlie = createUser('3');
    const unestablishedConversation = createConversation(0);
    const establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const conversationRepository = createRepository({
      conversation: unestablishedConversation,
      establishMeetingConversation,
      safeAddUsers,
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [charlie],
      usersToAdd: [charlie],
      userIdsToRemove: [],
      isCreate: false,
    });

    expect(result.isOk).toBe(true);
    expect(safeAddUsers).toHaveBeenCalledWith(unestablishedConversation, [charlie]);
    expect(establishMeetingConversation).not.toHaveBeenCalled();
  });

  it('returns partial failedToAdd from safeAddUsers on update', async () => {
    const charlie = createUser('3');
    const failedToAdd = [{users: [charlie.qualifiedId], backends: [], reason: 'UNREACHABLE_BACKENDS'}];
    const conversationRepository = createRepository({
      safeAddUsers: jest.fn().mockReturnValue(task.resolve({failedToAdd})),
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [charlie],
      usersToAdd: [charlie],
      userIdsToRemove: [],
      isCreate: false,
    });

    expect(result.isOk).toBe(true);
    expect(result.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual(failedToAdd);
  });

  it('returns addFailed when safeAddUsers rejects on update', async () => {
    const charlie = createUser('3');
    const conversationRepository = createRepository({
      safeAddUsers: jest.fn().mockReturnValue(task.reject(new Error('add failed'))),
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [charlie],
      usersToAdd: [charlie],
      userIdsToRemove: [],
      isCreate: false,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingConversationSyncErrors.addFailed);
  });

  it('returns removeFailed when safeRemoveMembers rejects', async () => {
    const alice = createUser('1');
    const conversationRepository = createRepository({
      safeRemoveMembers: jest.fn().mockReturnValue(task.reject(new Error('remove failed'))),
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [],
      usersToAdd: [],
      userIdsToRemove: [alice.qualifiedId],
      isCreate: false,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingConversationSyncErrors.removeFailed);
  });

  it('returns conversationNotFound when safeGetConversationById rejects', async () => {
    const conversationRepository = createRepository({
      safeGetConversationById: jest.fn().mockReturnValue(task.reject(new Error('not found'))),
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [],
      usersToAdd: [],
      userIdsToRemove: [],
      isCreate: true,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingConversationSyncErrors.conversationNotFound);
  });

  it('returns groupIdMissing when the conversation has no group id', async () => {
    const conversationWithoutGroup = createConversation();
    conversationWithoutGroup.groupId = undefined;
    const conversationRepository = createRepository({
      conversation: conversationWithoutGroup,
    });

    const result = await syncMeetingConversationParticipants(conversationRepository, {
      qualifiedConversationId,
      selectedUsers: [],
      usersToAdd: [],
      userIdsToRemove: [],
      isCreate: true,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingConversationSyncErrors.groupIdMissing);
  });
});
