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
import {RestActionStatus} from 'cells-sdk-ts';
import {Maybe} from 'true-myth';

import {createBulkRestoreController, type BulkRestoreOptions} from './bulkRestoreController';
import type {RestoreTarget} from './resolveRestoreTargets';

import type {SharedDriveMoveStatus} from '../../sharedDriveUploadStatusContext';
import {CellNodeType} from '../../../../../types/cellNode';

const status: SharedDriveMoveStatus = {
  id: 'restore-1',
  conversationQualifiedId: 'conversation-id@wire.test',
  action: 'restore',
  items: [],
  destinationPath: '',
  kind: 'processing',
};

const target: RestoreTarget = {
  kind: 'selected',
  node: {
    id: 'file-1',
    path: 'conversation-id/recycle_bin/file-1',
    name: 'file-1',
    sizeMb: '',
    sizeBytes: Maybe.nothing(),
    uploadedAtTimestamp: 0,
    owner: '',
    conversationName: '',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole: 'editor',
    extension: '',
    type: CellNodeType.FILE,
  },
};

const createOptions = (
  restoreNodes: BulkRestoreOptions['cellsRepository']['restoreNodes'],
): {
  options: BulkRestoreOptions;
  onStatusChange: jest.Mock;
  onRefreshAndReportSuccess: jest.Mock;
  publishStatus: jest.Mock;
} => {
  const onStatusChange = jest.fn();
  const onRefreshAndReportSuccess = jest.fn().mockResolvedValue(true);
  const publishStatus = jest.fn();
  const options: BulkRestoreOptions = {
    cellsRepository: {
      restoreNodes,
      lookupNodeByPath: jest.fn(),
      getBackgroundActionInfo: jest.fn(),
    },
    clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
    random: () => {
      return 0.5;
    },
    conversationQualifiedId: {id: 'conversation-id', domain: 'wire.test'},
    isCurrentScope: () => {
      return true;
    },
    onRefreshAndReportSuccess,
    onRestoreSettled: jest.fn(),
    onStatusChange,
    onStatusCleared: jest.fn(),
    reportError: jest.fn(),
    observeBackgroundAction: jest.fn(),
    publishStatus,
  };
  return {options, onStatusChange, onRefreshAndReportSuccess, publishStatus};
};

describe('createBulkRestoreController', () => {
  it('publishes state changes to subscribers while a restore completes', async () => {
    const request = Promise.withResolvers<Awaited<ReturnType<BulkRestoreOptions['cellsRepository']['restoreNodes']>>>();
    const {options, onStatusChange} = createOptions(jest.fn().mockReturnValue(request.promise));
    const controller = createBulkRestoreController(options);
    const snapshots: boolean[] = [];
    controller.subscribe(() => {
      snapshots.push(controller.getSnapshot().isPending);
    });

    const restoring = controller.restore([target], 'bin-scope', status);
    expect(controller.getSnapshot().isPending).toBe(true);
    request.resolve({Status: RestActionStatus.Performed});
    await restoring;

    expect(snapshots).toEqual([true, false]);
    expect(onStatusChange.mock.calls).toEqual([['processing'], ['completed']]);
  });

  it('publishes a late request result after the view disposes', async () => {
    const request = Promise.withResolvers<Awaited<ReturnType<BulkRestoreOptions['cellsRepository']['restoreNodes']>>>();
    const {options, onRefreshAndReportSuccess, publishStatus} = createOptions(
      jest.fn().mockReturnValue(request.promise),
    );
    const controller = createBulkRestoreController(options);

    const restoring = controller.restore([target], 'bin-scope', status);
    controller.dispose();
    request.resolve({Status: RestActionStatus.Performed});
    await restoring;

    expect(publishStatus).toHaveBeenCalledWith({...status, kind: 'completed'});
    expect(onRefreshAndReportSuccess).not.toHaveBeenCalled();
  });

  it.each([
    {didRefresh: true, expectedKind: 'completed'},
    {didRefresh: false, expectedKind: 'finished-unknown'},
  ])(
    'publishes the outcome when the view disposes during the refresh after a restore (refreshed: $didRefresh)',
    async ({didRefresh, expectedKind}) => {
      const refresh = Promise.withResolvers<boolean>();
      const refreshStarted = Promise.withResolvers<void>();
      const {options, onRefreshAndReportSuccess, publishStatus} = createOptions(
        jest.fn().mockResolvedValue({Status: RestActionStatus.Performed}),
      );
      onRefreshAndReportSuccess.mockImplementation(() => {
        refreshStarted.resolve();
        return refresh.promise;
      });
      const controller = createBulkRestoreController(options);

      const restoring = controller.restore([target], 'bin-scope', status);
      await refreshStarted.promise;
      controller.dispose();
      refresh.resolve(didRefresh);
      await restoring;

      expect(publishStatus).toHaveBeenCalledWith({...status, kind: expectedKind});
    },
  );
});
