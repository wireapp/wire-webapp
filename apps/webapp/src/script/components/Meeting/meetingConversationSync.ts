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

import is from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import type {AddUsersFailure} from '@wireapp/core/lib/conversation';
import {Task, task} from 'true-myth';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';

export const meetingConversationSyncErrors = {
  conversationNotFound: 'conversationNotFound',
  groupIdMissing: 'groupIdMissing',
  removeFailed: 'removeFailed',
  establishFailed: 'establishFailed',
  addFailed: 'addFailed',
} as const;

export type MeetingConversationSyncError =
  (typeof meetingConversationSyncErrors)[keyof typeof meetingConversationSyncErrors];

type SyncMeetingConversationParticipantsParams = {
  qualifiedConversationId: QualifiedId;
  selectedUsers: User[];
  usersToAdd: User[];
  userIdsToRemove: QualifiedId[];
  isCreate?: boolean;
};

const addUsers = (
  conversationRepository: ConversationRepository,
  conversation: Conversation,
  users: User[],
): Task<{failedToAdd: AddUsersFailure[]}, MeetingConversationSyncError> => {
  if (users.length === 0) {
    return task.resolve({failedToAdd: []});
  }

  return conversationRepository
    .safeAddUsers(conversation, users)
    .mapRejected(() => meetingConversationSyncErrors.addFailed);
};

const establishWithUsers = (
  conversationRepository: ConversationRepository,
  conversation: Conversation,
  userIdsToAdd: QualifiedId[],
): Task<{failedToAdd: AddUsersFailure[]}, MeetingConversationSyncError> => {
  const {groupId} = conversation;

  if (!is.nonEmptyString(groupId)) {
    return task.reject(meetingConversationSyncErrors.groupIdMissing);
  }

  return conversationRepository
    .establishMeetingConversation({
      groupId,
      userIdsToAdd,
      conversationQualifiedId: conversation.qualifiedId,
    })
    .mapRejected(() => meetingConversationSyncErrors.establishFailed);
};

const syncCreateParticipants = (
  conversationRepository: ConversationRepository,
  conversation: Conversation,
  usersToAdd: User[],
): Task<{failedToAdd: AddUsersFailure[]}, MeetingConversationSyncError> =>
  establishWithUsers(
    conversationRepository,
    conversation,
    usersToAdd.map(user => user.qualifiedId),
  );

const syncUpdateParticipants = (
  conversationRepository: ConversationRepository,
  conversation: Conversation,
  usersToAdd: User[],
  userIdsToRemove: QualifiedId[],
): Task<{failedToAdd: AddUsersFailure[]}, MeetingConversationSyncError> =>
  addUsers(conversationRepository, conversation, usersToAdd).andThen(addResult => {
    if (userIdsToRemove.length === 0) {
      return task.resolve(addResult);
    }

    return conversationRepository
      .safeRemoveMembers(conversation, userIdsToRemove)
      .mapRejected(() => meetingConversationSyncErrors.removeFailed)
      .map(() => addResult);
  });

export const syncMeetingConversationParticipants = (
  conversationRepository: ConversationRepository,
  {qualifiedConversationId, usersToAdd, userIdsToRemove, isCreate = false}: SyncMeetingConversationParticipantsParams,
): Task<{failedToAdd: AddUsersFailure[]}, MeetingConversationSyncError> =>
  conversationRepository
    .safeGetConversationById(qualifiedConversationId)
    .mapRejected(() => meetingConversationSyncErrors.conversationNotFound)
    .andThen(conversation =>
      isCreate
        ? syncCreateParticipants(conversationRepository, conversation, usersToAdd)
        : syncUpdateParticipants(conversationRepository, conversation, usersToAdd, userIdsToRemove),
    );
