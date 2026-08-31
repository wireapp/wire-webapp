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

import {noop} from 'noop-esm';
import {Task} from 'true-myth';

import type {CellsUploadGateway, CellsUploadGatewayError, UploadDraftRequest} from './gateway';
import {createCellsUploadManager} from './manager';
import type {UploadSource} from './identity';

const source: UploadSource = {blob: new Blob(['data']), name: 'file.txt', contentType: 'text/plain', size: 4};
const path = 'wire-cells-web/conversation-1';

const required = <T>(value: T | undefined): T => {
  expect(value).toBeDefined();
  return value as T;
};

const deferred = () => {
  let resolve!: (value: void) => void;
  let reject!: (error: CellsUploadGatewayError<'upload'>) => void;
  const task = new Task<void, CellsUploadGatewayError<'upload'>>((resolveTask, rejectTask) => {
    resolve = resolveTask;
    reject = rejectTask;
  });
  return {task, resolve, reject};
};

const deferredManager = () => {
  const requests: UploadDraftRequest[] = [];
  const tasks: ReturnType<typeof deferred>[] = [];
  const gateway: CellsUploadGateway = {
    uploadDraft: request => {
      requests.push(request);
      const result = deferred();
      tasks.push(result);
      return result.task;
    },
    publishDraft: () => Task.resolve<void, never>(undefined),
    discardDraft: () => Task.resolve<void, never>(undefined),
  };
  const instance = createCellsUploadManager({
    gateway,
    createResourceUuid: () => 'resource-1',
    createVersionUuid: () => 'version-1',
    createAttemptId: () => 'attempt-1',
    createAbortController: () => new AbortController(),
  });
  return {instance, requests, tasks};
};

describe('createCellsUploadManager', () => {
  const manager = () => {
    const requests: UploadDraftRequest[] = [];
    const gateway: CellsUploadGateway = {
      uploadDraft: request => {
        requests.push(request);
        return Task.resolve<void, never>(undefined);
      },
      publishDraft: () => Task.resolve<void, never>(undefined),
      discardDraft: () => Task.resolve<void, never>(undefined),
    };
    const instance = createCellsUploadManager({
      gateway,
      createResourceUuid: () => 'resource-1',
      createVersionUuid: () => 'version-1',
      createAttemptId: () => 'attempt-1',
      createAbortController: () => new AbortController(),
    });
    return {instance, requests};
  };

  it('registers by caller-owned upload ID and rejects duplicate IDs', () => {
    const fixture = manager();
    expect(fixture.instance.register('upload-1', source, path).isOk).toBe(true);
    expect(fixture.instance.register('upload-1', source, path)).toMatchObject({
      isErr: true,
      error: {kind: 'duplicateUpload', uploadId: 'upload-1'},
    });
    expect(fixture.instance.snapshot('upload-1')).toMatchObject({isOk: true, value: {kind: 'queued'}});
  });

  it('returns typed unknown-upload errors for every manager operation', async () => {
    const fixture = manager();
    expect(fixture.instance.snapshot('missing')).toMatchObject({
      isErr: true,
      error: {kind: 'unknownUpload', uploadId: 'missing'},
    });
    expect(fixture.instance.subscribe('missing', noop)).toMatchObject({
      isErr: true,
      error: {kind: 'unknownUpload'},
    });
    const start = await fixture.instance.start('missing');
    const cancel = await fixture.instance.cancel('missing');
    const retryUpload = await fixture.instance.retryUpload('missing');
    const publish = await fixture.instance.publish('missing');
    const retryPublish = await fixture.instance.retryPublish('missing');
    const discard = await fixture.instance.discard('missing');
    const retryDiscard = await fixture.instance.retryDiscard('missing');
    expect(start).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(cancel).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(retryUpload).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(publish).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(retryPublish).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(discard).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(retryDiscard).toMatchObject({isErr: true, error: {kind: 'unknownUpload', uploadId: 'missing'}});
    expect(fixture.instance.release('missing')).toMatchObject({isErr: true, error: {kind: 'unknownUpload'}});
  });

  it('ignores an old process success after cancel, release, and re-register', async () => {
    const fixture = deferredManager();
    fixture.instance.register('upload-1', source, path);
    const oldStart = fixture.instance.start('upload-1');
    const oldTask = required(fixture.tasks[0]);
    await fixture.instance.cancel('upload-1');
    expect(fixture.instance.release('upload-1').isOk).toBe(true);

    fixture.instance.register('upload-1', source, path);
    const events: string[] = [];
    fixture.instance.subscribe('upload-1', snapshot => events.push(snapshot.kind));
    const newStart = fixture.instance.start('upload-1');
    const beforeOldSettlement = fixture.instance.snapshot('upload-1');
    oldTask.resolve(undefined);
    await oldStart;
    expect(fixture.instance.snapshot('upload-1')).toEqual(beforeOldSettlement);
    expect(events).toEqual(['queued', 'uploading']);
    required(fixture.tasks[1]).resolve(undefined);
    await newStart;
    expect(fixture.instance.snapshot('upload-1')).toMatchObject({isOk: true, value: {kind: 'draftReady'}});
  });

  it('ignores an old process failure after cancel, release, and re-register', async () => {
    const fixture = deferredManager();
    fixture.instance.register('upload-1', source, path);
    const oldStart = fixture.instance.start('upload-1');
    const oldTask = required(fixture.tasks[0]);
    await fixture.instance.cancel('upload-1');
    expect(fixture.instance.release('upload-1').isOk).toBe(true);

    fixture.instance.register('upload-1', source, path);
    const events: string[] = [];
    fixture.instance.subscribe('upload-1', snapshot => events.push(snapshot.kind));
    const newStart = fixture.instance.start('upload-1');
    const beforeOldSettlement = fixture.instance.snapshot('upload-1');
    oldTask.reject({kind: 'gatewayError', operation: 'upload', cause: 'stale'});
    await oldStart;
    expect(fixture.instance.snapshot('upload-1')).toEqual(beforeOldSettlement);
    expect(events).toEqual(['queued', 'uploading']);
    required(fixture.tasks[1]).resolve(undefined);
    await newStart;
    expect(fixture.instance.snapshot('upload-1')).toMatchObject({isOk: true, value: {kind: 'draftReady'}});
  });

  it('releases terminal uploads and removes the registry entry', async () => {
    const fixture = manager();
    fixture.instance.register('upload-1', source, path);
    await fixture.instance.start('upload-1');
    expect(fixture.requests[0].path).toBe(path);
    await fixture.instance.publish('upload-1');
    expect(fixture.instance.release('upload-1').isOk).toBe(true);
    expect(fixture.instance.snapshot('upload-1')).toMatchObject({isErr: true, error: {kind: 'unknownUpload'}});
  });

  it('rejects release while non-terminal', () => {
    const fixture = manager();
    fixture.instance.register('upload-1', source, path);
    expect(fixture.instance.release('upload-1')).toMatchObject({
      isErr: true,
      error: {kind: 'invalidTransition', action: 'release'},
    });
  });
});
