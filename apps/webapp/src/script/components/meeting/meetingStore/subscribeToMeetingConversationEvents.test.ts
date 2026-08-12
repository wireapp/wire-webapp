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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import type {MeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';
import {subscribeToMeetingConversationEvents} from './subscribeToMeetingConversationEvents';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const conversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};

type MeetingLifecycleDispatcherDouble = {
  [Key in keyof MeetingLifecycleDispatcher]: jest.Mock;
};

const createDispatcherDouble = (): MeetingLifecycleDispatcherDouble => ({
  enqueueInitialLoad: jest.fn(),
  enqueueMeetingSync: jest.fn(),
  enqueueMeetingRemoval: jest.fn(),
  waitUntilAllSettled: jest.fn(async () => undefined),
});

describe('subscribeToMeetingConversationEvents', () => {
  const activeUnsubscribeCallbacks: (() => void)[] = [];

  afterEach(() => {
    activeUnsubscribeCallbacks.splice(0).forEach(unsubscribe => unsubscribe());
  });

  it('cancels and removes the meeting when self is involuntarily removed from its MLS conversation', () => {
    const dispatcher = createDispatcherDouble();
    const onMeetingCancelled = jest.fn();

    const unsubscribe = subscribeToMeetingConversationEvents({
      dispatcher,
      getMeetingSeries: () => [
        {
          conversation_id: '',
          recurrence: 'weekly',
          duration_ms: 60 * 60 * 1000,
          qualified_conversation: conversationId,
          qualified_creator: {id: 'creator-id', domain: 'example.com'},
          qualified_id: meetingId,
          series_end_date: '2026-06-01T11:00:00.000Z',
          series_start_date: '2026-06-01T10:00:00.000Z',
          title: 'Weekly sync',
        },
      ],
      onMeetingCancelled,
    });
    activeUnsubscribeCallbacks.push(unsubscribe);

    amplify.publish(WebAppEvents.CONVERSATION.SELF_REMOVED, {
      qualifiedConversationId: conversationId,
      initiatedBySelf: false,
    });

    expect(onMeetingCancelled).toHaveBeenCalledWith(meetingId);
    expect(dispatcher.enqueueMeetingRemoval).toHaveBeenCalledWith(meetingId);
  });

  it('removes the meeting without cancelling when self initiated the leave', () => {
    const dispatcher = createDispatcherDouble();
    const onMeetingCancelled = jest.fn();

    const unsubscribe = subscribeToMeetingConversationEvents({
      dispatcher,
      getMeetingSeries: () => [
        {
          conversation_id: '',
          recurrence: 'weekly',
          duration_ms: 60 * 60 * 1000,
          qualified_conversation: conversationId,
          qualified_creator: {id: 'creator-id', domain: 'example.com'},
          qualified_id: meetingId,
          series_end_date: '2026-06-01T11:00:00.000Z',
          series_start_date: '2026-06-01T10:00:00.000Z',
          title: 'Weekly sync',
        },
      ],
      onMeetingCancelled,
    });
    activeUnsubscribeCallbacks.push(unsubscribe);

    amplify.publish(WebAppEvents.CONVERSATION.SELF_REMOVED, {
      qualifiedConversationId: conversationId,
      initiatedBySelf: true,
    });

    expect(onMeetingCancelled).not.toHaveBeenCalled();
    expect(dispatcher.enqueueMeetingRemoval).toHaveBeenCalledWith(meetingId);
  });

  it('ignores self-removed events for conversations that are not linked to a meeting in the store', () => {
    const dispatcher = createDispatcherDouble();
    const onMeetingCancelled = jest.fn();

    const unsubscribe = subscribeToMeetingConversationEvents({
      dispatcher,
      getMeetingSeries: () => [],
      onMeetingCancelled,
    });
    activeUnsubscribeCallbacks.push(unsubscribe);

    amplify.publish(WebAppEvents.CONVERSATION.SELF_REMOVED, {
      qualifiedConversationId: conversationId,
      initiatedBySelf: false,
    });

    expect(onMeetingCancelled).not.toHaveBeenCalled();
    expect(dispatcher.enqueueMeetingRemoval).not.toHaveBeenCalled();
  });
});
