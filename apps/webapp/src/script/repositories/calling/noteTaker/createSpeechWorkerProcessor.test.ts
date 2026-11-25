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

import assert from 'node:assert/strict';
import {task} from 'true-myth';

import {
  createSpeechWorkerProcessor,
  type SpeechTranscriber,
  type SpeechWorkerDependencies,
} from './createSpeechWorkerProcessor';
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './speechWorkerProtocol';

function setup(): {
  responses: SpeechWorkerResponse[];
  gpu: SpeechTranscriber;
  cpu: SpeechTranscriber;
  supportsWebGpu: jest.MockedFunction<SpeechWorkerDependencies['supportsWebGpu']>;
  createTranscriber: jest.MockedFunction<SpeechWorkerDependencies['createTranscriber']>;
  processor: ReturnType<typeof createSpeechWorkerProcessor>;
  load: Extract<SpeechWorkerRequest, {type: 'load'}>;
} {
  const responses: SpeechWorkerResponse[] = [];
  const gpu: SpeechTranscriber = {
    warmup: jest.fn(() => {
      return task.resolve(undefined);
    }),
    transcribe: jest.fn(() => {
      return task.resolve('Hello');
    }),
    dispose: jest.fn(() => {
      return task.resolve(undefined);
    }),
  };
  const cpu: SpeechTranscriber = {
    warmup: jest.fn(() => {
      return task.resolve(undefined);
    }),
    transcribe: jest.fn(() => {
      return task.resolve('Hello from CPU');
    }),
    dispose: jest.fn(() => {
      return task.resolve(undefined);
    }),
  };
  const supportsWebGpu = jest.fn(() => {
    return task.resolve<boolean, Error>(true);
  });
  const createTranscriber = jest.fn(({device}: Parameters<SpeechWorkerDependencies['createTranscriber']>[0]) => {
    return task.resolve<SpeechTranscriber, Error>(device === 'webgpu' ? gpu : cpu);
  });
  const processor = createSpeechWorkerProcessor({
    supportsWebGpu,
    createTranscriber,
    respond(response) {
      responses.push(response);
    },
  });
  const load: Extract<SpeechWorkerRequest, {type: 'load'}> = {
    type: 'load',
    requestIdentifier: 1,
    model: 'base',
    device: 'auto',
    language: 'en',
  };
  return {responses, gpu, cpu, supportsWebGpu, createTranscriber, processor, load};
}

describe('speech worker processor', () => {
  it('rejects remote or unsupported models before creating a transcriber', async () => {
    const {processor, load, createTranscriber, responses} = setup();
    await processor.receive({...load, model: 'https://example.test/model'});
    await processor.receive({...load, model: 'medium'});
    expect(createTranscriber).not.toHaveBeenCalled();
    expect(responses).toEqual([
      {type: 'error', message: 'Invalid speech worker request'},
      {type: 'error', message: 'Invalid speech worker request'},
    ]);
  });

  it('warms up before becoming ready, and transcribes with the selected language', async () => {
    const {processor, gpu, load, responses} = setup();
    const warmup = task.withResolvers<void, Error>();
    gpu.warmup = () => {
      return warmup.task;
    };
    const loading = processor.receive({...load, language: 'de'});
    expect(
      responses.some(message => {
        return message.type === 'ready';
      }),
    ).toBe(false);
    warmup.resolve(undefined);
    assert((await loading).isOk);
    expect(responses.at(-1)).toEqual({type: 'ready', requestIdentifier: 1, device: 'webgpu'});
    const audio = new Float32Array(16000);
    await processor.receive({type: 'transcribe', requestIdentifier: 2, audio});
    expect(gpu.transcribe).toHaveBeenCalledWith(audio, 'de');
    expect(responses.at(-1)).toEqual({type: 'result', requestIdentifier: 2, text: 'Hello'});
  });

  it('falls back when no GPU adapter exists but never falls back in GPU-only mode', async () => {
    const {processor, load, supportsWebGpu, createTranscriber, responses} = setup();
    supportsWebGpu.mockReturnValue(task.resolve(false));
    await processor.receive(load);
    expect(createTranscriber).toHaveBeenCalledTimes(1);
    expect(createTranscriber).toHaveBeenCalledWith(expect.objectContaining({device: 'wasm'}));
    expect(responses.at(-1)).toEqual({type: 'ready', requestIdentifier: 1, device: 'wasm'});
    createTranscriber.mockClear();
    await processor.receive({...load, requestIdentifier: 3, device: 'webgpu'});
    expect(createTranscriber).not.toHaveBeenCalled();
    expect(responses.at(-1)).toEqual(expect.objectContaining({type: 'error', requestIdentifier: 3}));
  });

  it('awaits failed GPU cleanup before allocating a CPU model', async () => {
    const {processor, gpu, load, createTranscriber, responses} = setup();
    gpu.warmup = () => {
      return task.reject(new Error('GPU warmup failed'));
    };
    const disposal = task.withResolvers<void, Error>();
    const disposing = Promise.withResolvers<void>();
    gpu.dispose = () => {
      disposing.resolve();
      return disposal.task;
    };
    const loading = processor.receive(load);
    await disposing.promise;
    expect(createTranscriber).toHaveBeenCalledTimes(1);
    disposal.resolve(undefined);
    await loading;
    expect(createTranscriber).toHaveBeenCalledTimes(2);
    expect(responses.at(-1)).toEqual({type: 'ready', requestIdentifier: 1, device: 'wasm'});
  });

  it('reports cleanup failure instead of allocating another model on top of it', async () => {
    const {processor, gpu, load, createTranscriber, responses} = setup();
    gpu.warmup = () => {
      return task.reject(new Error('GPU warmup failed'));
    };
    gpu.dispose = () => {
      return task.reject(new Error('GPU cleanup failed'));
    };
    await processor.receive(load);
    expect(createTranscriber).toHaveBeenCalledTimes(1);
    expect(responses.at(-1)).toEqual({type: 'error', requestIdentifier: 1, message: 'GPU cleanup failed'});
  });

  it('rejects concurrent commands without overwriting an in-flight result', async () => {
    const {processor, gpu, load, responses} = setup();
    await processor.receive(load);
    const transcription = task.withResolvers<string, Error>();
    gpu.transcribe = () => {
      return transcription.task;
    };
    const first = processor.receive({type: 'transcribe', requestIdentifier: 2, audio: new Float32Array(1)});
    await processor.receive({type: 'transcribe', requestIdentifier: 3, audio: new Float32Array(1)});
    expect(responses.at(-1)).toEqual(expect.objectContaining({type: 'error', requestIdentifier: 3}));
    transcription.resolve('Original result');
    await first;
    expect(responses.at(-1)).toEqual({type: 'result', requestIdentifier: 2, text: 'Original result'});
  });

  it('reports unloaded and invalid audio requests without entering inference', async () => {
    const {processor, responses, createTranscriber} = setup();
    await processor.receive({type: 'transcribe', requestIdentifier: 2, audio: new Float32Array(1)});
    expect(responses.at(-1)).toEqual({type: 'error', requestIdentifier: 2, message: 'Speech model is not loaded'});
    await processor.receive({type: 'transcribe', requestIdentifier: 3, audio: 'untrusted'});
    expect(responses.at(-1)).toEqual({type: 'error', message: 'Invalid speech worker request'});
    expect(createTranscriber).not.toHaveBeenCalled();
  });
});
