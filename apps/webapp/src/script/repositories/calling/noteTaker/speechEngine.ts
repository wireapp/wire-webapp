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

import {isUndefined} from '@sindresorhus/is';
import {noop} from 'noop-esm';
import {Maybe, result, task, type Task} from 'true-myth';

import type {SpeechModelId} from './speechModels';
import {
  parseSpeechWorkerRequest,
  parseSpeechWorkerResponse,
  type SpeechDevice,
  type SpeechLanguage,
  type SpeechProgress,
  type SpeechWorkerRequest,
} from './speechWorkerProtocol';
import {toSpeechError} from './toSpeechError';

export interface SpeechEngineOptions {
  device: SpeechDevice;
  language: SpeechLanguage;
}

/** Engines accept mono 16 kHz PCM. Capture and UI do not depend on a specific inference runtime. */
export interface SpeechEngine {
  readonly description?: string;
  load(
    model: SpeechModelId,
    onProgress: (progress: SpeechProgress) => void,
    options?: SpeechEngineOptions,
  ): Task<void, Error>;
  transcribe(audio: Float32Array<ArrayBuffer>): Task<string, Error>;
  dispose(): void;
}

type PendingRequest = {
  identifier: number;
  expectedResponse: 'ready' | 'result';
  operation: ReturnType<typeof task.withResolvers<string, Error>>;
};
type SpeechCommand =
  | Omit<Extract<SpeechWorkerRequest, {type: 'load'}>, 'requestIdentifier'>
  | Omit<Extract<SpeechWorkerRequest, {type: 'transcribe'}>, 'requestIdentifier'>;

export function createWhisperWorkerEngine(
  createWorker: () => Worker = () => {
    return new Worker(new URL('./speechWorker.ts', import.meta.url));
  },
): SpeechEngine {
  let description = '';
  let worker: Maybe<Worker> = Maybe.nothing();
  let pending: Maybe<PendingRequest> = Maybe.nothing();
  let nextRequestIdentifier = 0;

  function settleError(error: Error): void {
    if (pending.isJust) {
      pending.value.operation.reject(error);
    }
    pending = Maybe.nothing();
  }

  function load(
    model: SpeechModelId,
    onProgress: (progress: SpeechProgress) => void,
    options: SpeechEngineOptions = {device: 'auto', language: 'en'},
  ): Task<void, Error> {
    dispose();
    const created = result.tryOrElse(toSpeechError, createWorker);
    if (created.isErr) {
      return task.reject(created.error);
    }
    const activeWorker = created.value;
    worker = Maybe.just(activeWorker);
    activeWorker.onmessage = ({data}: MessageEvent<unknown>) => {
      if (worker.isNothing || worker.value !== activeWorker || pending.isNothing) {
        return;
      }
      const parsed = parseSpeechWorkerResponse(data);
      if (parsed.isErr) {
        settleError(parsed.error);
        return;
      }
      const response = parsed.value;
      if (!isUndefined(response.requestIdentifier) && response.requestIdentifier !== pending.value.identifier) {
        return;
      }
      if (response.type === 'progress') {
        onProgress(response.progress);
        return;
      }
      if (response.type === 'error') {
        settleError(new Error(response.message));
        return;
      }
      if (response.type !== pending.value.expectedResponse) {
        settleError(new Error('Unexpected speech worker response'));
        return;
      }
      if (response.type === 'ready') {
        description = response.device === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (WASM)';
      }
      const operation = pending.value.operation;
      pending = Maybe.nothing();
      operation.resolve(response.type === 'result' ? response.text : '');
    };
    activeWorker.onerror = event => {
      if (worker.isJust && worker.value === activeWorker) {
        settleError(new Error(event.message.length > 0 ? event.message : 'Speech worker failed'));
      }
    };
    activeWorker.onmessageerror = () => {
      if (worker.isJust && worker.value === activeWorker) {
        settleError(new Error('Cannot read speech worker response'));
      }
    };
    return request(activeWorker, {type: 'load', model, ...options}).map(noop);
  }

  function request(activeWorker: Worker, command: SpeechCommand): Task<string, Error> {
    if (pending.isJust) {
      return task.reject(new Error('Speech engine is already processing audio'));
    }
    const parsed = parseSpeechWorkerRequest({...command, requestIdentifier: ++nextRequestIdentifier});
    if (parsed.isErr) {
      return task.reject(parsed.error);
    }
    const message = parsed.value;
    const operation = task.withResolvers<string, Error>();
    pending = Maybe.just({
      identifier: message.requestIdentifier,
      expectedResponse: message.type === 'load' ? 'ready' : 'result',
      operation,
    });
    const sent = result.tryOrElse(toSpeechError, () => {
      activeWorker.postMessage(message, message.type === 'transcribe' ? [message.audio.buffer] : []);
    });
    if (sent.isErr) {
      settleError(sent.error);
    }
    return operation.task;
  }

  function transcribe(audio: Float32Array<ArrayBuffer>): Task<string, Error> {
    if (worker.isNothing) {
      return task.reject(new Error('Speech engine is not loaded'));
    }
    return request(worker.value, {type: 'transcribe', audio});
  }

  function dispose(): void {
    if (worker.isJust) {
      worker.value.terminate();
    }
    worker = Maybe.nothing();
    settleError(new Error('Note taker stopped'));
  }
  return {
    load,
    transcribe,
    dispose,
    get description() {
      return description;
    },
  };
}
