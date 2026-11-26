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

import {createWhisperWorkerEngine, type SpeechEngine} from './speechEngine';

type WorkerDouble = Pick<Worker, 'onmessage' | 'onerror' | 'onmessageerror' | 'postMessage' | 'terminate'>;
function createWorkerDouble(): {
  engine: SpeechEngine;
  worker: WorkerDouble;
  postMessage: jest.Mock;
  createWorker: jest.Mock<Worker, []>;
  message: (data: unknown) => void;
} {
  const postMessage = jest.fn();
  const worker: WorkerDouble = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage,
    terminate: jest.fn(),
  };
  const createWorker = jest.fn(() => {
    return worker as Worker;
  });
  const engine = createWhisperWorkerEngine(createWorker);
  const message = (data: Record<string, unknown>): void => {
    data = {requestIdentifier: postMessage.mock.calls.at(-1)?.[0].requestIdentifier, ...data};
    worker.onmessage?.call(worker as Worker, {data} as MessageEvent);
  };
  return {engine, worker, postMessage, createWorker, message};
}

describe('Whisper worker bridge', () => {
  it('creates its worker only on load and transfers ownership of PCM buffers', async () => {
    const {engine, worker, createWorker, message} = createWorkerDouble();
    expect(createWorker).not.toHaveBeenCalled();
    const loaded = engine.load('base', jest.fn());
    message({type: 'ready', device: 'webgpu'});
    expect((await loaded).isOk).toBe(true);
    expect(engine.description).toBe('GPU (WebGPU)');
    const audio = new Float32Array(16000);
    const transcribed = engine.transcribe(audio);
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      {type: 'transcribe', requestIdentifier: expect.any(Number), audio},
      [audio.buffer],
    );
    message({type: 'result', text: 'Hello'});
    const output = await transcribed;
    expect(output.isOk).toBe(true);
    if (output.isOk) {
      expect(output.value).toBe('Hello');
    }
    engine.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('settles pending work on disposal and rejects further audio immediately', async () => {
    const {engine} = createWorkerDouble();
    const loading = engine.load('base', jest.fn());
    engine.dispose();
    expect((await loading).isErr).toBe(true);
    expect((await engine.transcribe(new Float32Array(1))).isErr).toBe(true);
  });

  it('keeps the first request when another transcription arrives in flight', async () => {
    const {engine, message} = createWorkerDouble();
    const loading = engine.load('base', jest.fn());
    message({type: 'ready', device: 'wasm'});
    await loading;
    const first = engine.transcribe(new Float32Array(1));
    expect((await engine.transcribe(new Float32Array(1))).isErr).toBe(true);
    message({type: 'result', text: 'First request'});
    expect((await first).isOk).toBe(true);
    engine.dispose();
  });

  it('returns a failure when sending audio throws instead of leaving a pending operation', async () => {
    const {engine, postMessage, message} = createWorkerDouble();
    const loading = engine.load('base', jest.fn());
    message({type: 'ready', device: 'wasm'});
    await loading;
    postMessage.mockImplementationOnce(() => {
      throw new DOMException('Cannot clone');
    });
    expect((await engine.transcribe(new Float32Array(1))).isErr).toBe(true);
    engine.dispose();
  });
  it('rejects malformed replies instead of resolving a request as empty text', async () => {
    const {engine, message} = createWorkerDouble();
    const loading = engine.load('base', jest.fn());
    message({type: 'ready', device: 'unknown'});
    const result = await loading;
    expect(result.isErr).toBe(true);
    engine.dispose();
  });

  it('ignores a stale request identifier while a new transcription is pending', async () => {
    const {engine, message} = createWorkerDouble();
    const loading = engine.load('base', jest.fn());
    message({type: 'ready', device: 'wasm'});
    await loading;
    const transcribed = engine.transcribe(new Float32Array(1));
    message({type: 'result', requestIdentifier: 1, text: 'Stale load response'});
    message({type: 'result', text: 'Current transcript'});
    const result = await transcribed;
    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toBe('Current transcript');
    }
    engine.dispose();
  });
});
