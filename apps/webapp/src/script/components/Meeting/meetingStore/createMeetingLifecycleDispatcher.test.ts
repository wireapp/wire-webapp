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
import {task} from 'true-myth';

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {createMeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';
import type {MeetingLifecycleDispatcherDependencies} from './createMeetingLifecycleDispatcher';
import {syncMeetingErrors} from './createMeetingStore';

const flushPendingWork = () => Promise.resolve();

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const otherMeetingId: QualifiedId = {id: 'other-meeting-id', domain: 'example.com'};

const meetingSeries: MeetingSeries = {
  title: 'Weekly sync',
  series_start_date: '2026-06-16T10:00:00.000Z',
  series_end_date: '2026-06-16T11:00:00.000Z',
  duration_ms: 3_600_000,
  conversation_id: 'conversation-id',
  qualified_id: meetingId,
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  recurrence: 'doesNotRepeat',
};

type Deferred = {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
};

const createDeferred = (): Deferred => {
  let resolveDeferred: () => void = () => undefined;

  const promise = new Promise<void>(resolve => {
    resolveDeferred = resolve;
  });

  return {
    promise,
    resolve: () => resolveDeferred(),
  };
};

const createDependencies = (
  overrides: Partial<MeetingLifecycleDispatcherDependencies> = {},
): MeetingLifecycleDispatcherDependencies => ({
  loadMeetings: async () => undefined,
  syncMeeting: () => task.resolve({meeting: meetingSeries, applied: true}),
  removeMeeting: () => undefined,
  reportOperationFailure: jest.fn(),
  ...overrides,
});

describe('createMeetingLifecycleDispatcher', () => {
  it('finishes the initial meetings load before running lifecycle work queued after it', async () => {
    const completedSteps: string[] = [];
    const pendingLoad = createDeferred();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        loadMeetings: async () => {
          completedSteps.push('load:started');
          await pendingLoad.promise;
          completedSteps.push('load:finished');
        },
        syncMeeting: id => {
          completedSteps.push(`sync:${id.id}`);
          return task.resolve({meeting: meetingSeries, applied: true});
        },
      }),
    );

    dispatcher.enqueueInitialLoad();
    dispatcher.enqueueMeetingSync(meetingId);

    await flushPendingWork();

    expect(completedSteps).toEqual(['load:started']);

    pendingLoad.resolve();
    await dispatcher.waitUntilAllSettled();

    expect(completedSteps).toEqual(['load:started', 'load:finished', `sync:${meetingId.id}`]);
  });

  it('removes a meeting only after a slow sync queued before it has finished', async () => {
    const completedSteps: string[] = [];
    const pendingSync = createDeferred();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        syncMeeting: id =>
          task.tryOrElse(
            () => syncMeetingErrors.fetchFailed,
            async () => {
              completedSteps.push(`sync:${id.id}:started`);
              await pendingSync.promise;
              completedSteps.push(`sync:${id.id}:finished`);

              return {meeting: meetingSeries, applied: true};
            },
          ),
        removeMeeting: id => {
          completedSteps.push(`remove:${id.id}`);
        },
      }),
    );

    dispatcher.enqueueMeetingSync(meetingId);
    dispatcher.enqueueMeetingRemoval(meetingId);

    await flushPendingWork();

    expect(completedSteps).toEqual([`sync:${meetingId.id}:started`]);

    pendingSync.resolve();
    await dispatcher.waitUntilAllSettled();

    expect(completedSteps).toEqual([
      `sync:${meetingId.id}:started`,
      `sync:${meetingId.id}:finished`,
      `remove:${meetingId.id}`,
    ]);
  });

  it('runs a sync queued after a slow sync in enqueue order', async () => {
    const completedSteps: string[] = [];
    const pendingCreateSync = createDeferred();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        syncMeeting: id =>
          task.tryOrElse(
            () => syncMeetingErrors.fetchFailed,
            async () => {
              completedSteps.push(`sync:${id.id}:started`);

              if (id.id === meetingId.id) {
                await pendingCreateSync.promise;
              }

              completedSteps.push(`sync:${id.id}:finished`);

              return {meeting: meetingSeries, applied: true};
            },
          ),
      }),
    );

    dispatcher.enqueueMeetingSync(meetingId);
    dispatcher.enqueueMeetingSync(otherMeetingId);

    await flushPendingWork();

    expect(completedSteps).toEqual([`sync:${meetingId.id}:started`]);

    pendingCreateSync.resolve();
    await dispatcher.waitUntilAllSettled();

    expect(completedSteps).toEqual([
      `sync:${meetingId.id}:started`,
      `sync:${meetingId.id}:finished`,
      `sync:${otherMeetingId.id}:started`,
      `sync:${otherMeetingId.id}:finished`,
    ]);
  });

  it('keeps running queued work after a sync rejects', async () => {
    const removeMeeting = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        syncMeeting: () => task.reject(syncMeetingErrors.fetchFailed),
        removeMeeting,
      }),
    );

    dispatcher.enqueueMeetingSync(meetingId);
    dispatcher.enqueueMeetingRemoval(meetingId);

    await dispatcher.waitUntilAllSettled();

    expect(removeMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('reports when a sync Task rejects', async () => {
    const reportOperationFailure = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        syncMeeting: () => task.reject(syncMeetingErrors.fetchFailed),
        reportOperationFailure,
      }),
    );

    dispatcher.enqueueMeetingSync(meetingId);

    await dispatcher.waitUntilAllSettled();

    expect(reportOperationFailure).toHaveBeenCalledWith('meetingSync');
  });

  it('invokes the sync success callback with the fetched meeting', async () => {
    const onSuccess = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(createDependencies());

    dispatcher.enqueueMeetingSync(meetingId, onSuccess);
    await dispatcher.waitUntilAllSettled();

    expect(onSuccess).toHaveBeenCalledWith(meetingSeries);
  });

  it('does not invoke the sync success callback when syncing fails', async () => {
    const onSuccess = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({syncMeeting: () => task.reject(syncMeetingErrors.fetchFailed)}),
    );

    dispatcher.enqueueMeetingSync(meetingId, onSuccess);
    await dispatcher.waitUntilAllSettled();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not invoke the sync success callback when the store did not apply the result', async () => {
    const onSuccess = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({syncMeeting: () => task.resolve({meeting: meetingSeries, applied: false})}),
    );

    dispatcher.enqueueMeetingSync(meetingId, onSuccess);
    await dispatcher.waitUntilAllSettled();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not invoke a sync success callback after a removal is queued for the same meeting', async () => {
    const onSuccess = jest.fn();
    const pendingSync = createDeferred();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        syncMeeting: () =>
          task.tryOrElse(
            () => syncMeetingErrors.fetchFailed,
            async () => {
              await pendingSync.promise;
              return {meeting: meetingSeries, applied: true};
            },
          ),
      }),
    );

    dispatcher.enqueueMeetingSync(meetingId, onSuccess);
    dispatcher.enqueueMeetingRemoval(meetingId);
    pendingSync.resolve();
    await dispatcher.waitUntilAllSettled();

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('keeps running queued work after the initial load throws', async () => {
    const removeMeeting = jest.fn();
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        loadMeetings: async () => {
          throw new Error('load failed');
        },
        removeMeeting,
      }),
    );

    dispatcher.enqueueInitialLoad();
    dispatcher.enqueueMeetingRemoval(meetingId);

    await dispatcher.waitUntilAllSettled();

    expect(removeMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('keeps running queued work after a removal throws', async () => {
    const loadMeetings = jest.fn(async () => undefined);
    const dispatcher = createMeetingLifecycleDispatcher(
      createDependencies({
        loadMeetings,
        removeMeeting: () => {
          throw new Error('remove failed');
        },
      }),
    );

    dispatcher.enqueueMeetingRemoval(meetingId);
    dispatcher.enqueueInitialLoad();

    await dispatcher.waitUntilAllSettled();

    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });
});
