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

import {env, pipeline, type AutomaticSpeechRecognitionPipeline} from '@huggingface/transformers';
import {isNullOrUndefined, isUndefined} from '@sindresorhus/is';
import {Maybe, result, task, type Task} from 'true-myth';

// Track the runtime files as worker assets so Rspack serves them in development and production.
// Only model files come from Hugging Face.
env.allowLocalModels = false;
if (!isUndefined(env.backends.onnx.wasm)) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: new URL(
      '../../../../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs',
      import.meta.url,
    ).href,
    wasm: new URL(
      '../../../../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
      import.meta.url,
    ).href,
  };
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}

const SAMPLE_RATE = 16000;
let transcriber: Maybe<AutomaticSpeechRecognitionPipeline> = Maybe.nothing();
let language = 'en';

const toError = (error: unknown): Error => {
  return new Error(String(error));
};

function createTranscriber(device: 'webgpu' | 'wasm', model: string): Task<AutomaticSpeechRecognitionPipeline, Error> {
  return task.tryOrElse(toError, async () => {
    self.postMessage({type: 'progress', message: `Loading ${device === 'webgpu' ? 'GPU' : 'CPU'} model…`});
    return pipeline<'automatic-speech-recognition'>('automatic-speech-recognition', model, {
      device,
      dtype: device === 'webgpu' ? {encoder_model: 'fp32', decoder_model_merged: 'q4'} : 'q8',
      progress_callback: (progress: {status: string; file?: string; progress?: number}) => {
        const message = !isUndefined(progress.progress)
          ? `Downloading ${progress.file}: ${Math.round(progress.progress)}%`
          : progress.status;
        self.postMessage({type: 'progress', message});
      },
    });
  });
}

async function loadTranscriber(device: 'webgpu' | 'wasm', model: string): Promise<Awaited<Task<void, Error>>> {
  if (device === 'webgpu') {
    const gpu = (navigator as Navigator & {gpu?: {requestAdapter(): Promise<unknown>}}).gpu;
    if (isUndefined(gpu)) {
      return task.reject(new Error('WebGPU is unavailable on this browser/device'));
    }
    const adapter = await task.tryOrElse(toError, () => {
      return gpu.requestAdapter();
    });
    if (adapter.isErr) {
      return result.err(adapter.error);
    }
    if (isNullOrUndefined(adapter.value)) {
      return task.reject(new Error('No WebGPU adapter is available'));
    }
  }
  const created = await createTranscriber(device, model);
  if (created.isErr) {
    return result.err(created.error);
  }
  transcriber = Maybe.just(created.value);
  self.postMessage({type: 'progress', message: `Warming up ${device}…`});
  return task.tryOrElse(toError, async () => {
    await created.value(new Float32Array(SAMPLE_RATE), {max_new_tokens: 1});
  });
}

type WorkerRequest =
  | {type: 'load'; model: string; device?: 'auto' | 'webgpu' | 'wasm'; language?: string}
  | {type: 'transcribe'; audio: Float32Array};

async function handleMessage(data: WorkerRequest): Promise<void> {
  if (data.type === 'load') {
    language = data.language ?? 'en';
    let device: 'webgpu' | 'wasm' = data.device === 'wasm' ? 'wasm' : 'webgpu';
    let loaded = await loadTranscriber(device, data.model);
    if (loaded.isErr && device === 'webgpu' && data.device !== 'webgpu') {
      if (transcriber.isJust) {
        const previous = transcriber.value;
        await task.tryOrElse(toError, () => {
          return previous.dispose();
        });
        transcriber = Maybe.nothing();
      }
      self.postMessage({type: 'progress', message: `GPU unavailable; falling back to CPU: ${loaded.error.message}`});
      device = 'wasm';
      loaded = await loadTranscriber(device, data.model);
    }
    if (loaded.isErr) {
      self.postMessage({type: 'error', message: loaded.error.message});
      return;
    }
    self.postMessage({type: 'ready', device});
    return;
  }
  if (transcriber.isNothing) {
    self.postMessage({type: 'error', message: 'Speech model is not loaded'});
    return;
  }
  const activeTranscriber = transcriber.value;
  const output = await task.tryOrElse(toError, () => {
    return activeTranscriber(data.audio, {
      ...(language === 'auto' ? {} : {language}),
      task: 'transcribe',
    });
  });
  if (output.isErr) {
    self.postMessage({type: 'error', message: output.error.message});
    return;
  }
  const text = Array.isArray(output.value)
    ? output.value
        .map(part => {
          return part.text;
        })
        .join(' ')
    : output.value.text;
  self.postMessage({type: 'result', text});
}

self.onmessage = ({data}: MessageEvent<WorkerRequest>) => {
  void task
    .tryOrElse(toError, () => {
      return handleMessage(data);
    })
    .then(handled => {
      if (handled.isErr) {
        self.postMessage({type: 'error', message: handled.error.message});
      }
    });
};
