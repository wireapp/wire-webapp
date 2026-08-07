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

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import type {SyncMeetingError} from './createMeetingStore';

const dispatcherOperationFailed = 'dispatcherOperationFailed';

export type MeetingLifecycleDispatcherDependencies = {
  loadMeetings: () => Promise<void>;
  syncMeeting: (meetingId: QualifiedId) => Task<MeetingSeries, SyncMeetingError>;
  removeMeeting: (meetingId: QualifiedId) => void;
  reportOperationFailure: (operationName: string) => void;
};

export type MeetingLifecycleDispatcher = {
  /** Queues the initial meetings list load. */
  enqueueInitialLoad: () => void;
  /** Queues a refetch of a single meeting, used for created and updated events. */
  enqueueMeetingSync: (meetingId: QualifiedId, onSuccess?: (meeting: MeetingSeries) => void) => void;
  /** Queues the removal of a single meeting from the store. */
  enqueueMeetingRemoval: (meetingId: QualifiedId) => void;
  /** Resolves once all work queued before this call has settled. */
  waitUntilAllSettled: () => Promise<void>;
};

/**
 * Runs meeting lifecycle work strictly in enqueue order, so that a slow fetch can never
 * overwrite or resurrect a meeting that a later event already changed or deleted.
 * A failing operation is isolated and never stops the operations queued after it.
 */
export const createMeetingLifecycleDispatcher = (
  dependencies: MeetingLifecycleDispatcherDependencies,
): MeetingLifecycleDispatcher => {
  let queuedOperations: Promise<void> = Promise.resolve();

  const enqueue = (operationName: string, operation: () => Promise<unknown>): void => {
    queuedOperations = queuedOperations.then(async () => {
      const operationResult = await task.tryOrElse(() => dispatcherOperationFailed, operation);

      if (operationResult.isErr) {
        dependencies.reportOperationFailure(operationName);
      }
    });
  };

  return {
    enqueueInitialLoad: () => {
      enqueue('initialLoad', dependencies.loadMeetings);
    },
    enqueueMeetingSync: (meetingId, onSuccess) => {
      enqueue('meetingSync', async () => {
        const syncResult = await dependencies.syncMeeting(meetingId);

        if (syncResult.isErr) {
          dependencies.reportOperationFailure('meetingSync');
          return;
        }

        onSuccess?.(syncResult.value);
      });
    },
    enqueueMeetingRemoval: meetingId => {
      enqueue('meetingRemoval', async () => {
        dependencies.removeMeeting(meetingId);
      });
    },
    waitUntilAllSettled: () => queuedOperations,
  };
};
