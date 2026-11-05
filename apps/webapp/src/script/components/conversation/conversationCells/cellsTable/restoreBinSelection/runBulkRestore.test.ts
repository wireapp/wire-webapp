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

import {JobsTaskStatus, RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {Maybe} from 'true-myth';

import {CellNode, CellNodeType} from '../../../../../types/cellNode';

import {runBulkRestore, type BulkRestoreDependencies} from './runBulkRestore';
import type {RestoreTarget} from './resolveRestoreTargets';

const createNode = (id: string): CellNode => {
  return {
    id,
    path: `conversation-id/recycle_bin/${id}`,
    name: id,
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
  };
};

const performed: RestPerformActionResponse = {Status: RestActionStatus.Performed};

const backgroundWith = (...jobUuids: string[]): RestPerformActionResponse => {
  return {
    Status: RestActionStatus.Background,
    BackgroundActions: jobUuids.map(JobUuid => {
      return {Name: 'restore', JobUuid, Status: JobsTaskStatus.Running};
    }),
  };
};

const createDependencies = (overrides: Partial<BulkRestoreDependencies> = {}): BulkRestoreDependencies => {
  return {
    lookupRootParentId: jest.fn().mockResolvedValue('parent-id'),
    restoreNodes: jest.fn().mockResolvedValue(performed),
    observeJobs: jest.fn().mockResolvedValue('all-finished'),
    ...overrides,
  };
};

const selected = (id: string): RestoreTarget => {
  return {kind: 'selected', node: createNode(id)};
};

const parent = (rootParentName: string): RestoreTarget => {
  return {kind: 'parent', rootParentName, selectedNodes: [createNode(`${rootParentName}/child`)]};
};

describe('runBulkRestore', () => {
  it('submits all captured targets once and reports completion when the backend performs the restore', async () => {
    const dependencies = createDependencies();

    const outcome = await runBulkRestore({targets: [selected('a'), selected('b')], ...dependencies});

    expect(outcome).toBe('completed');
    expect(dependencies.restoreNodes).toHaveBeenCalledTimes(1);
    expect(dependencies.restoreNodes).toHaveBeenCalledWith({uuids: ['a', 'b']});
  });

  it('resolves each root parent by name and submits its id in place of the nested selection', async () => {
    const dependencies = createDependencies({lookupRootParentId: jest.fn().mockResolvedValue('folder-id')});

    await runBulkRestore({targets: [selected('a'), parent('Folder')], ...dependencies});

    expect(dependencies.lookupRootParentId).toHaveBeenCalledWith('Folder');
    expect(dependencies.restoreNodes).toHaveBeenCalledWith({uuids: ['a', 'folder-id']});
  });

  it('submits an id only once when a parent id equals a selected id', async () => {
    const dependencies = createDependencies({lookupRootParentId: jest.fn().mockResolvedValue('a')});

    await runBulkRestore({targets: [selected('a'), parent('Folder')], ...dependencies});

    expect(dependencies.restoreNodes).toHaveBeenCalledWith({uuids: ['a']});
  });

  it('reports request-failed without submitting when a root parent cannot be found', async () => {
    const dependencies = createDependencies({lookupRootParentId: jest.fn().mockRejectedValue(new Error('missing'))});

    const outcome = await runBulkRestore({targets: [selected('a'), parent('Folder')], ...dependencies});

    expect(outcome).toBe('request-failed');
    expect(dependencies.restoreNodes).not.toHaveBeenCalled();
  });

  it('reports request-failed when the restore request rejects', async () => {
    const dependencies = createDependencies({restoreNodes: jest.fn().mockRejectedValue(new Error('network'))});

    expect(await runBulkRestore({targets: [selected('a')], ...dependencies})).toBe('request-failed');
  });

  it('does not submit an empty target list', async () => {
    const dependencies = createDependencies();

    expect(await runBulkRestore({targets: [], ...dependencies})).toBe('request-failed');
    expect(dependencies.restoreNodes).not.toHaveBeenCalled();
  });

  it.each([
    {jobOutcome: 'all-finished', expected: 'completed'},
    {jobOutcome: 'mixed-terminal', expected: 'partial'},
    {jobOutcome: 'all-failed', expected: 'failed'},
    {jobOutcome: 'check-limit', expected: 'status-unknown'},
    {jobOutcome: 'status-unknown', expected: 'status-unknown'},
  ] as const)('maps background job outcome $jobOutcome to $expected', async ({jobOutcome, expected}) => {
    const dependencies = createDependencies({
      restoreNodes: jest.fn().mockResolvedValue(backgroundWith('job-1', 'job-2')),
      observeJobs: jest.fn().mockResolvedValue(jobOutcome),
    });

    expect(await runBulkRestore({targets: [selected('a')], ...dependencies})).toBe(expected);
    expect(dependencies.observeJobs).toHaveBeenCalledWith(['job-1', 'job-2']);
  });

  it('reports status-unknown when a background response carries no restore job to observe', async () => {
    const dependencies = createDependencies({
      restoreNodes: jest.fn().mockResolvedValue({Status: RestActionStatus.Background}),
    });

    expect(await runBulkRestore({targets: [selected('a')], ...dependencies})).toBe('status-unknown');
    expect(dependencies.observeJobs).not.toHaveBeenCalled();
  });
});
