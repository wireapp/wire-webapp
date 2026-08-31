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

import {Maybe, Result, maybe, result as resultModule, task} from 'true-myth';

import type {CellsUploadGateway, CellsUploadGatewayError} from './gateway';
import type {DraftIdentity, UploadSource} from './identity';
import type {UploadAction, UploadLifecycleError, UploadState} from './lifecycle';
import {transition} from './transition';

export type UploadProcessError = UploadLifecycleError | CellsUploadGatewayError | {readonly kind: 'released'};
export type UploadSnapshotListener = (snapshot: UploadState) => void;
export type AbortControllerFactory = () => AbortController;
export type IdFactory = () => string;

export type CellsUploadProcessDependencies = {
  readonly gateway: CellsUploadGateway;
  readonly createResourceUuid: IdFactory;
  readonly createVersionUuid: IdFactory;
  readonly createAttemptId: IdFactory;
  readonly createAbortController: AbortControllerFactory;
};

export type CellsUploadProcess = {
  readonly snapshot: () => Result<UploadState, UploadProcessError>;
  readonly subscribe: (listener: UploadSnapshotListener) => Result<() => void, UploadProcessError>;
  readonly start: () => Promise<Result<void, UploadProcessError>>;
  readonly cancel: () => Promise<Result<void, UploadProcessError>>;
  readonly retryUpload: () => Promise<Result<void, UploadProcessError>>;
  readonly publish: () => Promise<Result<void, UploadProcessError>>;
  readonly retryPublish: () => Promise<Result<void, UploadProcessError>>;
  readonly discard: () => Promise<Result<void, UploadProcessError>>;
  readonly retryDiscard: () => Promise<Result<void, UploadProcessError>>;
  readonly release: () => Result<void, UploadProcessError>;
};

type Attempt = {
  readonly id: string;
  readonly controller: AbortController;
  readonly identity: DraftIdentity;
};

const isSameState = (left: UploadState, right: UploadState): boolean => {
  if (left === right || left.kind !== right.kind) {
    return left === right;
  }
  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  return [...keys].every(key => leftRecord[key] === rightRecord[key]);
};

export const createCellsUploadProcess = (
  uploadId: string,
  source: UploadSource,
  path: string,
  dependencies: CellsUploadProcessDependencies,
): CellsUploadProcess => {
  let state: Maybe<UploadState> = Maybe.just({kind: 'queued', identity: {uploadId}, source});
  let activeSource: Maybe<UploadSource> = Maybe.just(source);
  let resourceUuid: Maybe<string> = Maybe.nothing();
  let currentAttempt: Maybe<Attempt> = Maybe.nothing();
  let operationId = 0;
  let released = false;
  const subscribers = new Set<UploadSnapshotListener>();

  const releasedResult = <T>(): Result<T, UploadProcessError> => Result.err({kind: 'released'});
  const snapshot = (): Result<UploadState, UploadProcessError> =>
    maybe.isJust(state) ? Result.ok(state.value) : releasedResult();

  const notify = (previous: UploadState, next: UploadState): void => {
    if (isSameState(previous, next)) {
      return;
    }
    state = Maybe.just(next);
    subscribers.forEach(listener => listener(next));
  };

  const apply = (action: UploadAction): Result<UploadState, UploadLifecycleError> => {
    if (maybe.isNothing(state)) {
      return Result.err({kind: 'invalidTransition', from: 'cancelled', action: action.type});
    }
    const result = transition(state.value, action);
    if (resultModule.isErr(result)) {
      return result;
    }
    notify(state.value, result.value);
    return result;
  };

  const isGatewayError = (
    reason: unknown,
    operation: CellsUploadGatewayError['operation'],
  ): reason is CellsUploadGatewayError =>
    typeof reason === 'object' &&
    reason !== null &&
    (reason as {kind?: unknown; operation?: unknown}).kind === 'gatewayError' &&
    (reason as {kind?: unknown; operation?: unknown}).operation === operation;

  const safeGateway = <T>(
    operation: CellsUploadGatewayError['operation'],
    call: () => PromiseLike<Result<T, CellsUploadGatewayError>>,
  ) =>
    task.tryOrElse(
      reason =>
        isGatewayError(reason, operation) ? reason : {kind: 'gatewayError' as const, operation, cause: reason},
      async () => {
        const result = await call();
        return resultModule.isErr(result) ? Promise.reject(result.error) : result.value;
      },
    );

  const isCurrentAttempt = (attempt: Attempt): boolean => {
    const activeAttempt = currentAttempt;
    const currentState = state;
    return (
      maybe.isJust(activeAttempt) &&
      activeAttempt.value === attempt &&
      maybe.isJust(currentState) &&
      currentState.value.kind === 'uploading'
    );
  };

  const runUpload = async (): Promise<Result<void, UploadProcessError>> => {
    const currentState = state;
    const currentResourceUuid = resourceUuid;
    const currentSource = activeSource;
    if (
      maybe.isNothing(currentState) ||
      currentState.value.kind !== 'uploading' ||
      maybe.isNothing(currentResourceUuid) ||
      maybe.isNothing(currentSource)
    ) {
      return Result.err({
        kind: 'invalidTransition',
        from: maybe.isJust(currentState) ? currentState.value.kind : 'cancelled',
        action: 'startUpload',
      });
    }
    const attempt: Attempt = {
      id: dependencies.createAttemptId(),
      controller: dependencies.createAbortController(),
      identity: {uploadId, resourceUuid: currentResourceUuid.value, versionId: dependencies.createVersionUuid()},
    };
    currentAttempt = Maybe.just(attempt);
    const gatewayResult = await safeGateway('upload', () =>
      dependencies.gateway.uploadDraft({
        uploadId,
        attemptId: attempt.id,
        identity: attempt.identity,
        source: currentSource.value,
        path,
        signal: attempt.controller.signal,
        abortController: attempt.controller,
        onProgress: progress => {
          if (isCurrentAttempt(attempt)) {
            apply({type: 'progress', progress});
          }
        },
      }),
    );

    if (!isCurrentAttempt(attempt)) {
      return Result.ok(undefined);
    }
    currentAttempt = Maybe.nothing();
    if (resultModule.isErr(gatewayResult)) {
      apply({type: 'uploadFailed', error: {kind: 'uploadFailed', cause: gatewayResult.error}});
      return Result.err(gatewayResult.error);
    }
    resourceUuid = Maybe.just(gatewayResult.value.resourceUuid);
    apply({
      type: 'uploadSucceeded',
      resourceUuid: gatewayResult.value.resourceUuid,
      versionId: gatewayResult.value.versionId,
    });
    return Result.ok(undefined);
  };

  const start = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    if (maybe.isNothing(resourceUuid)) {
      resourceUuid = Maybe.just(dependencies.createResourceUuid());
    }
    const result = apply({type: 'startUpload'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    return runUpload();
  };

  const cancel = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    if (maybe.isJust(state) && state.value.kind === 'cancelled') {
      return Result.ok(undefined);
    }
    const result = apply({type: 'cancel'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    const attempt = currentAttempt;
    currentAttempt = Maybe.nothing();
    if (maybe.isJust(attempt)) {
      attempt.value.controller.abort();
    }
    return Result.ok(undefined);
  };

  const retryUpload = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    const result = apply({type: 'retryUpload'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    return start();
  };

  const runDraftOperation = async (
    operation: 'publish' | 'discard',
    identity: DraftIdentity,
    completion: UploadAction,
  ): Promise<Result<void, UploadProcessError>> => {
    const operationToken = ++operationId;
    const gatewayResult = await safeGateway(operation, () =>
      operation === 'publish'
        ? dependencies.gateway.publishDraft(identity)
        : dependencies.gateway.discardDraft(identity),
    );
    if (
      released ||
      operationToken !== operationId ||
      maybe.isNothing(state) ||
      state.value.kind !== `${operation}ing`
    ) {
      return Result.ok(undefined);
    }
    if (resultModule.isErr(gatewayResult)) {
      apply(
        operation === 'publish'
          ? {type: 'publishFailed', error: {kind: 'publishFailed', cause: gatewayResult.error}}
          : {type: 'discardFailed', error: {kind: 'discardFailed', cause: gatewayResult.error}},
      );
      return Result.err(gatewayResult.error);
    }
    apply(completion);
    return Result.ok(undefined);
  };

  const publish = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    const result = apply({type: 'publish'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    if (result.value.kind !== 'publishing') {
      return Result.err({kind: 'invalidTransition', from: result.value.kind, action: 'publish'});
    }
    return runDraftOperation('publish', result.value.identity, {type: 'publishSucceeded'});
  };

  const retryPublish = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    const result = apply({type: 'retryPublish'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    return publish();
  };

  const discard = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    const result = apply({type: 'discard'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    if (result.value.kind !== 'discarding') {
      return Result.err({kind: 'invalidTransition', from: result.value.kind, action: 'discard'});
    }
    return runDraftOperation('discard', result.value.identity, {type: 'discardSucceeded'});
  };

  const retryDiscard = async (): Promise<Result<void, UploadProcessError>> => {
    if (released) {
      return releasedResult();
    }
    const result = apply({type: 'retryDiscard'});
    if (resultModule.isErr(result)) {
      return Result.err(result.error);
    }
    return discard();
  };

  const subscribe = (listener: UploadSnapshotListener): Result<() => void, UploadProcessError> => {
    if (maybe.isNothing(state)) {
      return releasedResult();
    }
    subscribers.add(listener);
    listener(state.value);
    return Result.ok(() => subscribers.delete(listener));
  };

  const release = (): Result<void, UploadProcessError> => {
    if (released) {
      return releasedResult();
    }
    if (maybe.isNothing(state) || !['published', 'discarded', 'cancelled'].includes(state.value.kind)) {
      return Result.err({
        kind: 'invalidTransition',
        from: maybe.isJust(state) ? state.value.kind : 'cancelled',
        action: 'release',
      });
    }
    const attempt = currentAttempt;
    currentAttempt = Maybe.nothing();
    if (maybe.isJust(attempt)) {
      attempt.value.controller.abort();
    }
    operationId += 1;
    subscribers.clear();
    state = Maybe.nothing();
    activeSource = Maybe.nothing();
    resourceUuid = Maybe.nothing();
    released = true;
    return Result.ok(undefined);
  };

  return {snapshot, subscribe, start, cancel, retryUpload, publish, retryPublish, discard, retryDiscard, release};
};
