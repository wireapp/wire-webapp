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
import {subscribeToMeetingLifecycleEvents} from './subscribeToMeetingLifecycleEvents';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const selfUserId: QualifiedId = {id: 'self-user-id', domain: 'example.com'};
const otherUserId: QualifiedId = {id: 'other-user-id', domain: 'example.com'};

type MeetingLifecycleDispatcherDouble = {
  [Key in keyof MeetingLifecycleDispatcher]: jest.Mock;
};

const createDispatcherDouble = (): MeetingLifecycleDispatcherDouble => ({
  enqueueInitialLoad: jest.fn(),
  enqueueMeetingSync: jest.fn(),
  enqueueMeetingRemoval: jest.fn(),
  waitUntilAllSettled: jest.fn(async () => undefined),
});

describe('subscribeToMeetingLifecycleEvents', () => {
  const activeUnsubscribeCallbacks: (() => void)[] = [];

  const subscribe = (dispatcher: MeetingLifecycleDispatcherDouble) => {
    const notifyMeetingChange = jest.fn();
    const notifyUpdate = jest.fn();
    const unsubscribe = subscribeToMeetingLifecycleEvents({
      dispatcher,
      getSelfUserQualifiedId: () => selfUserId,
      notifyMeetingChange,
      notifyUpdate,
    });
    activeUnsubscribeCallbacks.push(unsubscribe);

    return {notifyMeetingChange, notifyUpdate, unsubscribe};
  };

  afterEach(() => {
    activeUnsubscribeCallbacks.splice(0).forEach(unsubscribe => unsubscribe());
  });

  it('queues a meeting sync when a meeting created event is published', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);

    expect(dispatcher.enqueueMeetingSync).toHaveBeenCalledWith(meetingId);
    expect(dispatcher.enqueueMeetingRemoval).not.toHaveBeenCalled();
  });

  it('queues a meeting sync when a meeting updated event is published', () => {
    const dispatcher = createDispatcherDouble();
    const {notifyUpdate} = subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId, otherUserId);

    expect(dispatcher.enqueueMeetingSync).toHaveBeenCalledWith(meetingId, notifyUpdate);
    expect(dispatcher.enqueueMeetingRemoval).not.toHaveBeenCalled();
  });

  it('queues a meeting sync when a meeting member-added event is published', () => {
    const dispatcher = createDispatcherDouble();
    const {notifyMeetingChange} = subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, otherUserId);

    expect(dispatcher.enqueueMeetingSync).toHaveBeenCalledWith(meetingId, notifyMeetingChange);
    expect(dispatcher.enqueueMeetingRemoval).not.toHaveBeenCalled();
  });

  it('queues a meeting removal when a meeting deleted event is published', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);

    expect(dispatcher.enqueueMeetingRemoval).toHaveBeenCalledWith(meetingId);
    expect(dispatcher.enqueueMeetingSync).not.toHaveBeenCalled();
  });

  it('queues a sync without a notification callback for an update authored by the current user', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId, selfUserId);

    expect(dispatcher.enqueueMeetingSync).toHaveBeenCalledWith(meetingId);
    expect(dispatcher.enqueueMeetingSync).not.toHaveBeenCalledWith(meetingId, expect.any(Function));
  });

  it('queues a sync without a notification callback for a member-added event authored by the current user', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, selfUserId);

    expect(dispatcher.enqueueMeetingSync).toHaveBeenCalledWith(meetingId);
    expect(dispatcher.enqueueMeetingSync).not.toHaveBeenCalledWith(meetingId, expect.any(Function));
  });

  it('queues a meetings reload when missed events are reported', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    amplify.publish(WebAppEvents.CONVERSATION.MISSED_EVENTS);

    expect(dispatcher.enqueueInitialLoad).toHaveBeenCalledTimes(1);
  });

  it('stops handling meeting lifecycle events after unsubscribing', () => {
    const dispatcher = createDispatcherDouble();
    const {unsubscribe} = subscribe(dispatcher);

    unsubscribe();

    amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);
    amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId);
    amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId);
    amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);
    amplify.publish(WebAppEvents.CONVERSATION.MISSED_EVENTS);

    expect(dispatcher.enqueueInitialLoad).not.toHaveBeenCalled();
    expect(dispatcher.enqueueMeetingSync).not.toHaveBeenCalled();
    expect(dispatcher.enqueueMeetingRemoval).not.toHaveBeenCalled();
  });

  it('does not queue the initial load on its own', () => {
    const dispatcher = createDispatcherDouble();
    subscribe(dispatcher);

    expect(dispatcher.enqueueInitialLoad).not.toHaveBeenCalled();
  });
});
