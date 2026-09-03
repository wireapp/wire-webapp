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

import {Task} from 'true-myth';
import type {Result} from 'true-myth';

import type {CellsUploadGateway, CellsUploadGatewayError, UploadDraftRequest} from './gateway';
import type {DraftIdentity, UploadSource} from './identity';
import type {UploadState} from './lifecycle';
import {createCellsUploadProcess, type CellsUploadProcessDependencies} from './process';

const source: UploadSource = {blob: new Blob(['data']), name: 'file.txt', contentType: 'text/plain', size: 4};
const path = 'wire-cells-web/conversation-1';

const required = <T>(value: T | undefined): T => {
  expect(value).toBeDefined();
  return value as T;
};

const unwrapResult = <T, E>(result: Result<T, E>): T => {
  expect(result.isOk).toBe(true);
  return result.unwrapOr(undefined as never);
};

const deferred = <T, E>(defaultValue?: T) => {
  let resolve!: (value?: T) => void;
  let reject!: (error: E) => void;
  const value = new Task<T, E>((resolveTask, rejectTask) => {
    resolve = nextValue => resolveTask(nextValue ?? (defaultValue as T));
    reject = rejectTask;
  });
  return {value, resolve, reject};
};

const setup = (
  failure?: 'publish' | 'discard' | 'mismatch',
  duplicateAttemptIds = false,
  remoteIdentity: DraftIdentity = {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
) => {
  const uploads: UploadDraftRequest[] = [];
  const uploadTasks: ReturnType<typeof deferred<DraftIdentity, CellsUploadGatewayError<'upload'>>>[] = [];
  const aborts: AbortController[] = [];
  const published = [] as string[];
  const discarded = [] as string[];
  let failureMode = failure;
  const gateway: CellsUploadGateway = {
    uploadDraft: request => {
      uploads.push(request);
      if (failureMode === 'mismatch') {
        return Task.reject<DraftIdentity, CellsUploadGatewayError<'upload'>>({
          kind: 'gatewayError',
          operation: 'publish' as CellsUploadGatewayError<'upload'>['operation'],
          cause: 'mismatched-operation',
        });
      }
      const task = deferred<DraftIdentity, CellsUploadGatewayError<'upload'>>(remoteIdentity);
      uploadTasks.push(task);
      return task.value;
    },
    publishDraft: identity => {
      published.push(identity.versionId);
      return failureMode === 'publish'
        ? Task.reject<void, CellsUploadGatewayError<'publish'>>({
            kind: 'gatewayError',
            operation: 'publish',
            cause: 'offline',
          })
        : Task.resolve<void, never>(undefined);
    },
    discardDraft: identity => {
      discarded.push(identity.versionId);
      return failureMode === 'discard'
        ? Task.reject<void, CellsUploadGatewayError<'discard'>>({
            kind: 'gatewayError',
            operation: 'discard',
            cause: 'offline',
          })
        : Task.resolve<void, never>(undefined);
    },
  };
  let version = 0;
  let attempt = 0;
  const dependencies: CellsUploadProcessDependencies = {
    gateway,
    createResourceUuid: () => 'resource-1',
    createVersionUuid: () => `version-${++version}`,
    createAttemptId: () => (duplicateAttemptIds ? 'attempt-1' : `attempt-${++attempt}`),
    createAbortController: () => {
      const controller = new AbortController();
      aborts.push(controller);
      return controller;
    },
  };
  return {
    process: createCellsUploadProcess('upload-1', source, path, dependencies),
    uploads,
    uploadTasks,
    aborts,
    published,
    discarded,
    setFailure: (mode?: 'publish' | 'discard') => {
      failureMode = mode;
    },
  };
};

const unwrap = async <T, E>(promise: PromiseLike<{isOk: boolean; value?: T; error?: E}>) => {
  const result = await promise;
  expect(result.isOk).toBe(true);
  return result;
};

describe('createCellsUploadProcess', () => {
  it('uploads successfully and reports initial, intermediate, and complete progress in order', async () => {
    const fixture = setup();
    const snapshots: UploadState[] = [];
    const subscription = fixture.process.subscribe(snapshot => snapshots.push(snapshot));
    expect(subscription.isOk).toBe(true);
    const start = fixture.process.start();
    expect(fixture.process.snapshot()).toMatchObject({value: {kind: 'uploading', progress: 0, hasProgress: false}});
    required(fixture.uploads[0]).onProgress(0);
    required(fixture.uploads[0]).onProgress(0.25);
    required(fixture.uploads[0]).onProgress(1);
    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);
    expect(snapshots.map(snapshot => snapshot.kind)).toEqual([
      'queued',
      'uploading',
      'uploading',
      'uploading',
      'uploading',
      'draftReady',
    ]);
    expect(snapshots[1]).toMatchObject({progress: 0, hasProgress: false});
    expect(snapshots[2]).toMatchObject({progress: 0, hasProgress: true});
    expect(snapshots[3]).toMatchObject({progress: 0.25, hasProgress: true});
    expect(snapshots[4]).toMatchObject({progress: 1, hasProgress: true});
  });

  it('clamps invalid progress and ignores an out-of-order update', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    const request = required(fixture.uploads[0]);

    request.onProgress(-1);
    expect(fixture.process.snapshot()).toMatchObject({value: {progress: 0, hasProgress: true}});
    request.onProgress(0.8);
    request.onProgress(0.4);
    expect(fixture.process.snapshot()).toMatchObject({value: {progress: 0.8, hasProgress: true}});
    request.onProgress(2);
    expect(fixture.process.snapshot()).toMatchObject({value: {progress: 1, hasProgress: true}});

    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);
  });

  it('uses the repository-returned remote identity after upload', async () => {
    const remoteIdentity: DraftIdentity = {
      uploadId: 'upload-1',
      resourceUuid: 'remote-resource',
      versionId: 'remote-version',
    };
    const fixture = setup(undefined, false, remoteIdentity);
    const start = fixture.process.start();
    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);

    expect(fixture.process.snapshot().unwrapOr({kind: 'cancelled', identity: {uploadId: 'missing'}, source})).toEqual({
      kind: 'draftReady',
      identity: remoteIdentity,
      source,
    });
    await unwrap(fixture.process.publish());
    expect(fixture.published).toEqual(['remote-version']);
  });

  it('reports typed upload failure and aborts only the active attempt', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    required(fixture.uploadTasks[0]).reject({kind: 'gatewayError', operation: 'upload', cause: 'offline'});
    const result = await start;
    expect(result.isErr).toBe(true);
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'cancelled', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({kind: 'uploadFailed'});
    expect(required(fixture.aborts[0]).signal.aborted).toBe(false);
  });

  it('cancels queued work without creating a controller and is idempotent', async () => {
    const fixture = setup();
    await unwrap(fixture.process.cancel());
    expect(fixture.aborts).toHaveLength(0);
    await unwrap(fixture.process.cancel());
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({kind: 'cancelled'});
  });

  it('aborts an active upload and suppresses its late result', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    await unwrap(fixture.process.cancel());
    required(fixture.uploads[0]).onProgress(0.9);
    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);
    expect(required(fixture.aborts[0]).signal.aborted).toBe(true);
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({kind: 'cancelled'});
  });

  it('does not publish a cancelled upload', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    await unwrap(fixture.process.cancel());
    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);

    expect((await fixture.process.publish()).isErr).toBe(true);
    expect(fixture.published).toEqual([]);
  });

  it('suppresses stale progress callbacks after a retry starts', async () => {
    const fixture = setup();
    const first = fixture.process.start();
    const firstRequest = required(fixture.uploads[0]);
    expect(firstRequest.path).toBe(path);
    firstRequest.onProgress(0.25);
    required(fixture.uploadTasks[0]).reject({kind: 'gatewayError', operation: 'upload', cause: 'offline'});
    await first;

    const retry = fixture.process.retryUpload();
    const secondRequest = required(fixture.uploads[1]);
    expect(secondRequest.path).toBe(path);
    expect(secondRequest.identity).toMatchObject({resourceUuid: 'resource-1', versionId: 'version-2'});
    expect(secondRequest.attemptId).toBe('attempt-2');
    const snapshots: string[] = [];
    required(fixture.process.subscribe(snapshot => snapshots.push(snapshot.kind)));
    firstRequest.onProgress(0.9);
    firstRequest.onProgress(1);
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'cancelled', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({
      kind: 'uploading',
      progress: 0,
    });
    required(fixture.uploadTasks[1]).resolve(undefined);
    await unwrap(retry);
    expect(snapshots).toEqual(['uploading', 'draftReady']);
  });

  it('isolates retries when the injected attempt IDs are duplicated', async () => {
    const fixture = setup(undefined, true);
    const first = fixture.process.start();
    const firstRequest = required(fixture.uploads[0]);
    required(fixture.uploadTasks[0]).reject({kind: 'gatewayError', operation: 'upload', cause: 'offline'});
    await first;

    const retry = fixture.process.retryUpload();
    const secondRequest = required(fixture.uploads[1]);
    expect(secondRequest.attemptId).toBe(firstRequest.attemptId);
    firstRequest.onProgress(0.9);
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'cancelled', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({
      kind: 'uploading',
      progress: 0,
    });
    required(fixture.uploadTasks[1]).resolve(undefined);
    await unwrap(retry);
  });

  it('normalizes a mismatched gateway operation at the process boundary', async () => {
    const fixture = setup('mismatch');
    const result = await fixture.process.start();
    expect(result).toMatchObject({
      isErr: true,
      error: {
        kind: 'gatewayError',
        operation: 'upload',
        cause: {kind: 'gatewayError', operation: 'publish', cause: 'mismatched-operation'},
      },
    });
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'cancelled', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({
      kind: 'uploadFailed',
      error: {
        kind: 'uploadFailed',
        cause: {kind: 'gatewayError', operation: 'upload'},
      },
    });
  });

  it('suppresses a late failure after cancellation', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    const request = required(fixture.uploads[0]);
    await unwrap(fixture.process.cancel());
    request.onProgress(0.9);
    required(fixture.uploadTasks[0]).reject({kind: 'gatewayError', operation: 'upload', cause: 'late'});
    await unwrap(start);
    expect(
      fixture.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({
      kind: 'cancelled',
    });
  });

  it('reports publish and discard failures with recoverable clean states', async () => {
    const publishFailure = setup('publish');
    const publishStart = publishFailure.process.start();
    required(publishFailure.uploadTasks[0]).resolve(undefined);
    await publishStart;
    expect((await publishFailure.process.publish()).isErr).toBe(true);
    expect(
      publishFailure.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toEqual({
      kind: 'publishFailed',
      identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
      source,
      error: {kind: 'publishFailed', cause: {kind: 'gatewayError', operation: 'publish', cause: 'offline'}},
    });

    const discardFailure = setup('discard');
    const discardStart = discardFailure.process.start();
    required(discardFailure.uploadTasks[0]).resolve(undefined);
    await discardStart;
    expect((await discardFailure.process.discard()).isErr).toBe(true);
    expect(
      discardFailure.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toMatchObject({
      kind: 'discardFailed',
      error: {kind: 'discardFailed', cause: {kind: 'gatewayError', operation: 'discard', cause: 'offline'}},
    });
  });

  it('retries publish and discard successfully after their failures', async () => {
    const publishFixture = setup('publish');
    const publishStart = publishFixture.process.start();
    required(publishFixture.uploadTasks[0]).resolve(undefined);
    await unwrap(publishStart);
    await publishFixture.process.publish();
    publishFixture.setFailure();
    await unwrap(publishFixture.process.retryPublish());
    expect(
      publishFixture.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toEqual({
      kind: 'published',
      identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
      source,
    });

    const discardFixture = setup('discard');
    const discardStart = discardFixture.process.start();
    required(discardFixture.uploadTasks[0]).resolve(undefined);
    await unwrap(discardStart);
    await discardFixture.process.discard();
    discardFixture.setFailure();
    await unwrap(discardFixture.process.retryDiscard());
    expect(
      discardFixture.process.snapshot().unwrapOr({kind: 'queued', identity: {uploadId: 'missing'}, source}),
    ).toEqual({
      kind: 'discarded',
      identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
      source,
    });
  });

  it('publishes and discards through the gateway', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    required(fixture.uploadTasks[0]).resolve(undefined);
    await unwrap(start);
    await unwrap(fixture.process.publish());
    expect(fixture.published).toEqual(['version-1']);

    const second = setup();
    const secondStart = second.process.start();
    required(second.uploadTasks[0]).resolve(undefined);
    await unwrap(secondStart);
    await unwrap(second.process.discard());
    expect(second.discarded).toEqual(['version-1']);
  });

  it('notifies subscribers synchronously in registration order and supports unsubscribe', async () => {
    const fixture = setup();
    const events: string[] = [];
    const first = fixture.process.subscribe(() => events.push('first'));
    const second = fixture.process.subscribe(() => events.push('second'));
    expect(events).toEqual(['first', 'second']);
    unwrapResult(first)();
    const start = fixture.process.start();
    required(fixture.uploadTasks[0]).resolve(undefined);
    await start;
    expect(events).toEqual(['first', 'second', 'second', 'second']);
    const before = events.length;
    unwrapResult(fixture.process.subscribe(() => events.push('third')))();
    expect(events.length).toBe(before + 1);
    expect(second.isOk).toBe(true);
  });

  it('releases terminal process state and rejects later snapshots', async () => {
    const fixture = setup();
    const start = fixture.process.start();
    required(fixture.uploadTasks[0]).resolve(undefined);
    await start;
    await fixture.process.publish();
    expect(fixture.process.release().isOk).toBe(true);
    expect(fixture.process.snapshot().isErr).toBe(true);
    expect(fixture.process.start().then(result => result.isErr)).resolves.toBe(true);
  });
});
