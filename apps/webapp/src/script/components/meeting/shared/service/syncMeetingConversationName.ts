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
import {task, type Task} from 'true-myth';

import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/meeting/meetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/conversationRepository';
import {isMeetingConversation} from 'Repositories/conversation/conversationSelectors';

export type SyncMeetingConversationNameParams = {
  qualifiedConversationId: QualifiedId;
  title: string;
};

/**
 * Renames the dedicated meeting conversation when its live name differs from the meeting title.
 * Skips non-meeting conversations and when names already match.
 */
export const syncMeetingConversationName = (
  conversationRepository: ConversationRepository,
  {qualifiedConversationId, title}: SyncMeetingConversationNameParams,
): Task<void, MeetingSubmitErrors> => {
  return conversationRepository
    .safeGetConversationById(qualifiedConversationId)
    .mapRejected(() => {
      return meetingSubmitErrors.conversationRenameFailed;
    })
    .andThen(conversation => {
      if (!isMeetingConversation(conversation)) {
        return task.resolve(undefined);
      }

      if (conversation.name() === title) {
        return task.resolve(undefined);
      }

      return task
        .tryOrElse(
          () => {
            return meetingSubmitErrors.conversationRenameFailed;
          },
          () => {
            return conversationRepository.renameConversation(conversation, title);
          },
        )
        .map(() => {
          return undefined;
        });
    });
};
