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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Task, task} from 'true-myth';

import {
  meetingConversationSyncErrors,
  type MeetingConversationSyncError,
} from 'Components/Meeting/meetingConversationSync';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const safeLeaveMeetingConversation = (
  conversationRepository: ConversationRepository,
  qualifiedConversationId: QualifiedId,
): Task<void, MeetingConversationSyncError> =>
  conversationRepository
    .safeGetConversationById(qualifiedConversationId)
    .mapRejected(() => meetingConversationSyncErrors.conversationNotFound)
    .andThen(conversation =>
      task.tryOrElse(
        () => meetingConversationSyncErrors.leaveFailed,
        () => conversationRepository.leaveConversation(conversation),
      ),
    );

export const removeMeetingConversationLocally = (
  conversationRepository: ConversationRepository,
  qualifiedConversationId: QualifiedId,
): Task<void, MeetingConversationSyncError> =>
  task.tryOrElse(
    () => meetingConversationSyncErrors.leaveFailed,
    () => conversationRepository.deleteConversationLocally(qualifiedConversationId, true),
  );

export const removeAllOtherMeetingParticipants = (
  conversationRepository: ConversationRepository,
  conversation: Conversation,
  selfUser: User,
): Task<void, MeetingConversationSyncError> => {
  const userIdsToRemove = conversation
    .participating_user_ets()
    .filter(user => !matchQualifiedIds(user.qualifiedId, selfUser.qualifiedId))
    .map(user => user.qualifiedId);

  if (userIdsToRemove.length === 0) {
    return task.resolve(undefined);
  }

  return conversationRepository
    .safeRemoveMembers(conversation, userIdsToRemove)
    .mapRejected(() => meetingConversationSyncErrors.removeFailed);
};
