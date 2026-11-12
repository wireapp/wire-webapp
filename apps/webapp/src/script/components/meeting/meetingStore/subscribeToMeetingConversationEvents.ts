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

import {amplify} from 'amplify';

import type {MeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {WebAppEvents, type ConversationSelfRemovedPayload} from '../../../webAppEvents';
import type {MeetingSeries} from '../types/meetingSeries';
import {findMeetingSeriesByQualifiedConversation} from '../utils/findMeetingSeriesByQualifiedConversation';

export type SubscribeToMeetingConversationEventsDependencies = {
  dispatcher: MeetingLifecycleDispatcher;
  getMeetingSeries: () => readonly MeetingSeries[];
  onMeetingCancelled: (meetingId: QualifiedId) => void;
};

/**
 * Reacts when the signed-in user is removed from a conversation that is linked to a meeting.
 * Returns the callback which removes the subscription again.
 */
export const subscribeToMeetingConversationEvents = ({
  dispatcher,
  getMeetingSeries,
  onMeetingCancelled,
}: SubscribeToMeetingConversationEventsDependencies): (() => void) => {
  const onSelfRemovedFromConversation = ({
    qualifiedConversationId,
    initiatedBySelf,
  }: ConversationSelfRemovedPayload): void => {
    const meeting = findMeetingSeriesByQualifiedConversation(getMeetingSeries(), qualifiedConversationId);
    if (meeting.isNothing) {
      return;
    }

    if (!initiatedBySelf) {
      onMeetingCancelled(meeting.value.qualified_id);
    }

    dispatcher.enqueueMeetingRemoval(meeting.value.qualified_id);
  };

  amplify.subscribe(WebAppEvents.CONVERSATION.SELF_REMOVED, onSelfRemovedFromConversation);

  return () => {
    amplify.unsubscribe(WebAppEvents.CONVERSATION.SELF_REMOVED, onSelfRemovedFromConversation);
  };
};
