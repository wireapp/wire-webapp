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
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {findMeetingSeriesByQualifiedConversation} from 'Components/meeting/utils/findMeetingSeriesByQualifiedConversation';

import type {MeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';

export type SubscribeToMeetingConversationEventsDependencies = {
  dispatcher: MeetingLifecycleDispatcher;
  getMeetingSeries: () => readonly MeetingSeries[];
  onMeetingRemovedForSelf: (meetingId: QualifiedId) => void;
};

/**
 * Reacts when the signed-in user is removed from a conversation that is linked to a meeting.
 * Returns the callback which removes the subscription again.
 */
export const subscribeToMeetingConversationEvents = ({
  dispatcher,
  getMeetingSeries,
  onMeetingRemovedForSelf,
}: SubscribeToMeetingConversationEventsDependencies): (() => void) => {
  const onSelfRemovedFromConversation = (qualifiedConversationId: QualifiedId) => {
    const meeting = findMeetingSeriesByQualifiedConversation(getMeetingSeries(), qualifiedConversationId);
    if (meeting === undefined) {
      return;
    }

    onMeetingRemovedForSelf(meeting.qualified_id);
    dispatcher.enqueueMeetingRemoval(meeting.qualified_id);
  };

  amplify.subscribe(WebAppEvents.CONVERSATION.SELF_REMOVED, onSelfRemovedFromConversation);

  return () => {
    amplify.unsubscribe(WebAppEvents.CONVERSATION.SELF_REMOVED, onSelfRemovedFromConversation);
  };
};
