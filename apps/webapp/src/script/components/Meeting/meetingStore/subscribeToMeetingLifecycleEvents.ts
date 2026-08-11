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

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {matchQualifiedIds} from 'Util/qualifiedId';

import type {MeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';

export type SubscribeToMeetingLifecycleEventsDependencies = {
  dispatcher: MeetingLifecycleDispatcher;
  getSelfUserQualifiedId: () => QualifiedId;
  notifyUpdate: (meeting: MeetingSeries) => void;
};

/**
 * Routes the meeting lifecycle events distributed by the event repository to the dispatcher.
 * Returns the callback which removes all subscriptions again.
 */
export const subscribeToMeetingLifecycleEvents = ({
  dispatcher,
  getSelfUserQualifiedId,
  notifyUpdate,
}: SubscribeToMeetingLifecycleEventsDependencies): (() => void) => {
  const onMeetingCreated = (meetingId: QualifiedId) => {
    dispatcher.enqueueMeetingSync(meetingId);
  };

  const enqueueMeetingSyncWithUpdateNotification = (meetingId: QualifiedId) => {
    dispatcher.enqueueMeetingSync(meetingId, notifyUpdate);
  };

  const onMeetingUpdated = (meetingId: QualifiedId, actorId: QualifiedId) => {
    if (matchQualifiedIds(actorId, getSelfUserQualifiedId())) {
      dispatcher.enqueueMeetingSync(meetingId);
      return;
    }

    enqueueMeetingSyncWithUpdateNotification(meetingId);
  };

  const onMeetingMemberAdded = (meetingId: QualifiedId, actorId: QualifiedId) => {
    if (matchQualifiedIds(actorId, getSelfUserQualifiedId())) {
      dispatcher.enqueueMeetingSync(meetingId);
      return;
    }

    enqueueMeetingSyncWithUpdateNotification(meetingId);
  };

  const onMeetingDeleted = (meetingId: QualifiedId) => {
    dispatcher.enqueueMeetingRemoval(meetingId);
  };

  const onMissedEvents = () => {
    dispatcher.enqueueInitialLoad();
  };

  amplify.subscribe(WebAppEvents.MEETING.CREATED, onMeetingCreated);
  amplify.subscribe(WebAppEvents.MEETING.UPDATED, onMeetingUpdated);
  amplify.subscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);
  amplify.subscribe(WebAppEvents.MEETING.MEMBER_ADDED, onMeetingMemberAdded);
  amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, onMissedEvents);

  return () => {
    amplify.unsubscribe(WebAppEvents.MEETING.CREATED, onMeetingCreated);
    amplify.unsubscribe(WebAppEvents.MEETING.UPDATED, onMeetingUpdated);
    amplify.unsubscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);
    amplify.unsubscribe(WebAppEvents.MEETING.MEMBER_ADDED, onMeetingMemberAdded);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, onMissedEvents);
  };
};
