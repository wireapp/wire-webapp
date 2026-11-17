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

import {isError} from '@sindresorhus/is';
import {noop} from 'noop-esm';
import {Maybe, result, task, type Task} from 'true-myth';

export interface SpeechEngineOptions {
  device: 'auto' | 'webgpu' | 'wasm';
  language: string;
}

/** Engines accept mono 16 kHz PCM. Implement this interface to plug in another runtime. */
export interface SpeechEngine {
  readonly description?: string;
  load(model: string, onProgress: (message: string) => void, options?: SpeechEngineOptions): Task<void, Error>;
  transcribe(audio: Float32Array): Task<string, Error>;
  dispose(): void;
}

export function toSpeechError(error: unknown): Error {
  return isError(error) ? error : new Error(String(error));
}

type PendingRequest = ReturnType<typeof task.withResolvers<string, Error>>;

export function createWhisperWorkerEngine(
  createWorker: () => Worker = () => {
    return new Worker(new URL('./speechWorker.ts', import.meta.url));
  },
): SpeechEngine {
  let description = '';
  let worker: Maybe<Worker> = Maybe.nothing();
  let pending: Maybe<PendingRequest> = Maybe.nothing();

  function settleError(error: Error): void {
    if (pending.isJust) {
      pending.value.reject(error);
    }
    pending = Maybe.nothing();
  }

  function load(
    model: string,
    onProgress: (message: string) => void,
    options?: SpeechEngineOptions,
  ): Task<void, Error> {
    dispose();
    // Creating the worker is the first point at which the inference library loads.
    const created = result.tryOrElse(toSpeechError, createWorker);
    if (created.isErr) {
      return task.reject(created.error);
    }
    const activeWorker = created.value;
    worker = Maybe.just(activeWorker);
    activeWorker.onmessage = ({data}) => {
      if (data.type === 'progress') {
        onProgress(data.message);
        return;
      }
      if (data.type === 'ready') {
        description = data.device === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (WASM)';
      }
      const request = pending;
      pending = Maybe.nothing();
      if (request.isJust) {
        const value = request.value;
        if (data.type === 'error') {
          value.reject(new Error(data.message));
        } else {
          value.resolve(data.text ?? '');
        }
      }
    };
    activeWorker.onerror = event => {
      settleError(new Error(event.message.length > 0 ? event.message : 'Speech worker failed'));
    };
    activeWorker.onmessageerror = () => {
      settleError(new Error('Cannot read speech worker response'));
    };
    return request(activeWorker, {type: 'load', model, ...options}).map(noop);
  }

  function request(activeWorker: Worker, message: unknown, transfer: Transferable[] = []): Task<string, Error> {
    if (pending.isJust) {
      return task.reject(new Error('Speech engine is already processing audio'));
    }
    const operation = task.withResolvers<string, Error>();
    pending = Maybe.just(operation);
    const sent = result.tryOrElse(toSpeechError, () => {
      activeWorker.postMessage(message, transfer);
    });
    if (sent.isErr) {
      settleError(sent.error);
    }
    return operation.task;
  }

  function transcribe(audio: Float32Array): Task<string, Error> {
    if (worker.isNothing) {
      return task.reject(new Error('Speech engine is not loaded'));
    }
    return request(worker.value, {type: 'transcribe', audio}, [audio.buffer]);
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
