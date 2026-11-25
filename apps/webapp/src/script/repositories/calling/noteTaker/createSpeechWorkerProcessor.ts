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

import {Maybe, task, type Task} from 'true-myth';

import type {SpeechModelId} from './speechModels';
import {
  parseSpeechWorkerRequest,
  maxSpeechMessageLength,
  type SpeechLanguage,
  type SpeechProgress,
  type SpeechRuntimeDevice,
  type SpeechWorkerRequest,
  type SpeechWorkerResponse,
} from './speechWorkerProtocol';
import {toSpeechError} from './toSpeechError';

export interface SpeechTranscriber {
  warmup(): Task<void, Error>;
  transcribe(audio: Float32Array, language: SpeechLanguage): Task<string, Error>;
  dispose(): Task<void, Error>;
}
export interface SpeechWorkerDependencies {
  supportsWebGpu(): Task<boolean, Error>;
  createTranscriber(options: {
    model: SpeechModelId;
    device: SpeechRuntimeDevice;
    onProgress: (progress: SpeechProgress) => void;
  }): Task<SpeechTranscriber, Error>;
  respond(message: SpeechWorkerResponse): void;
}

export function createSpeechWorkerProcessor({supportsWebGpu, createTranscriber, respond}: SpeechWorkerDependencies): {
  receive(message: unknown): Task<void, Error>;
} {
  let transcriber: Maybe<SpeechTranscriber> = Maybe.nothing();
  let language: SpeechLanguage = 'en';
  let busy = false;

  function fail(error: Error, requestIdentifier: number): void {
    respond({type: 'error', requestIdentifier, message: error.message.slice(0, maxSpeechMessageLength)});
  }

  function loadModel(model: SpeechModelId, device: SpeechRuntimeDevice, requestIdentifier: number): Task<void, Error> {
    const supported: Task<boolean, Error> = device === 'wasm' ? task.resolve(true) : supportsWebGpu();
    return supported.andThen(available => {
      if (!available) {
        return task.reject(new Error('WebGPU is unavailable on this browser/device'));
      }
      respond({type: 'progress', requestIdentifier, progress: {phase: 'load', device}});
      return createTranscriber({
        model,
        device,
        onProgress(progress) {
          respond({type: 'progress', requestIdentifier, progress});
        },
      }).andThen(created => {
        transcriber = Maybe.just(created);
        respond({type: 'progress', requestIdentifier, progress: {phase: 'warmup', device}});
        return created.warmup();
      });
    });
  }

  function release(): Task<void, Error> {
    if (transcriber.isNothing) {
      return task.resolve(undefined);
    }
    const previous = transcriber.value;
    transcriber = Maybe.nothing();
    return previous.dispose();
  }

  async function execute(request: SpeechWorkerRequest): Promise<void> {
    const {requestIdentifier} = request;
    if (request.type === 'load') {
      const released = await release();
      if (released.isErr) {
        fail(released.error, requestIdentifier);
        return;
      }
      language = request.language;
      let device: SpeechRuntimeDevice = request.device === 'wasm' ? 'wasm' : 'webgpu';
      let loaded = await loadModel(request.model, device, requestIdentifier);
      if (loaded.isErr && device === 'webgpu' && request.device === 'auto') {
        const releasedGpu = await release();
        if (releasedGpu.isErr) {
          fail(releasedGpu.error, requestIdentifier);
          return;
        }
        respond({
          type: 'progress',
          requestIdentifier,
          progress: {phase: 'fallback', reason: loaded.error.message.slice(0, maxSpeechMessageLength)},
        });
        device = 'wasm';
        loaded = await loadModel(request.model, device, requestIdentifier);
      }
      if (loaded.isErr) {
        await release();
        fail(loaded.error, requestIdentifier);
        return;
      }
      respond({type: 'ready', requestIdentifier, device});
      return;
    }
    if (transcriber.isNothing) {
      fail(new Error('Speech model is not loaded'), requestIdentifier);
      return;
    }
    const output = await transcriber.value.transcribe(request.audio, language);
    if (output.isErr) {
      fail(output.error, requestIdentifier);
      return;
    }
    respond({type: 'result', requestIdentifier, text: output.value});
  }

  function receive(message: unknown): Task<void, Error> {
    const parsed = parseSpeechWorkerRequest(message);
    if (parsed.isErr) {
      respond({type: 'error', message: parsed.error.message});
      return task.resolve(undefined);
    }
    if (busy) {
      fail(new Error('Speech worker is already processing a request'), parsed.value.requestIdentifier);
      return task.resolve(undefined);
    }
    busy = true;
    return task.tryOrElse(toSpeechError, async () => {
      try {
        await execute(parsed.value);
      } finally {
        busy = false;
      }
    });
  }
  return {receive};
}
