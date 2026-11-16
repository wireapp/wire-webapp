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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {createBulkJobPollingPolicy} from './common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import {createSharedDriveBackgroundActionController} from './sharedDriveBackgroundActionController';
import type {observeCellsBackgroundActionJobs} from './common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import type {SharedDriveMoveStatus} from './sharedDriveUploadStatusContext';

const status: SharedDriveMoveStatus = {
  id: 'move-1',
  conversationQualifiedId: 'conversation@example.com',
  action: 'move',
  kind: 'processing',
  items: [{id: 'file-1', name: 'report.pdf', isFolder: false}],
  destinationPath: 'Reports',
};

describe('createSharedDriveBackgroundActionController', () => {
  it('keeps observing until the move completes and publishes the result', () => {
    const publishStatus = jest.fn();
    const onOutcome = jest.fn();
    const cancel = jest.fn();
    let observed: Parameters<typeof observeCellsBackgroundActionJobs>[0] | undefined;
    const observeJobs = jest.fn((options: Parameters<typeof observeCellsBackgroundActionJobs>[0]) => {
      observed = options;
      return cancel;
    });
    const controller = createSharedDriveBackgroundActionController(publishStatus, observeJobs);
    const request = {
      actionName: 'move' as const,
      status,
      jobUuids: ['job-1'],
      cellsRepository: {getBackgroundMoveInfo: jest.fn()},
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      pollingPolicy: createBulkJobPollingPolicy(() => {
        return 0.5;
      }),
      onOutcome,
    };

    controller.start(request);
    controller.start(request);
    expect(observeJobs).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();

    observed?.onStatusSnapshot?.([]);
    observed?.onOutcome('all-finished');

    expect(publishStatus).toHaveBeenLastCalledWith({...status, kind: 'completed'});
    expect(onOutcome).toHaveBeenCalledWith('all-finished');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('cancels in-flight polling when the app status provider is disposed', () => {
    const cancel = jest.fn();
    const controller = createSharedDriveBackgroundActionController(jest.fn(), () => {
      return cancel;
    });

    controller.start({
      actionName: 'move',
      status,
      jobUuids: ['job-1'],
      cellsRepository: {getBackgroundMoveInfo: jest.fn()},
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      pollingPolicy: createBulkJobPollingPolicy(() => {
        return 0.5;
      }),
      onOutcome: jest.fn(),
    });
    controller.stopAll();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('observes a move-to-bin job through the delete endpoint', () => {
    const publishStatus = jest.fn();
    let observed: Parameters<typeof observeCellsBackgroundActionJobs>[0] | undefined;
    const controller = createSharedDriveBackgroundActionController(publishStatus, options => {
      observed = options;
      return jest.fn();
    });

    controller.start({
      actionName: 'delete',
      status: {...status, id: 'move-to-bin'},
      jobUuids: ['delete-job'],
      cellsRepository: {getBackgroundActionInfo: jest.fn()},
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      pollingPolicy: createBulkJobPollingPolicy(() => {
        return 0.5;
      }),
      onOutcome: jest.fn(),
    });

    expect(observed?.actionName).toBe('delete');
    observed?.onOutcome('all-finished');
    expect(publishStatus).toHaveBeenLastCalledWith({...status, id: 'move-to-bin', kind: 'completed'});
  });
});
