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

import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {env, pipeline} from '@huggingface/transformers';
import {isFunction, isNullOrUndefined, isObject, isUndefined} from '@sindresorhus/is';
import {task, type Task} from 'true-myth';
import {z} from 'zod';

import {
  createSpeechWorkerProcessor,
  type SpeechTranscriber,
  type SpeechWorkerDependencies,
} from './createSpeechWorkerProcessor';
import {speechModelBasePath, speechModelDirectory} from './speechModels';
import {maxSpeechMessageLength, fullProgressPercent} from './speechWorkerProtocol';
import {toSpeechError} from './toSpeechError';

// Models and ONNX support files are served by this webapp. No inference-time remote downloads.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL(speechModelBasePath, self.location.href).href;
if (!isUndefined(env.backends.onnx.wasm)) {
  const runtimeBase = new URL('/min/onnxruntime/', self.location.href);
  env.backends.onnx.wasm.wasmPaths = {
    mjs: new URL('ort-wasm-simd-threaded.jsep.mjs', runtimeBase).href,
    wasm: new URL('ort-wasm-simd-threaded.jsep.wasm', runtimeBase).href,
  };
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}

const sampleRate = 16000;
const downloadProgressSchema = z.object({file: z.string(), progress: z.number().finite()});
const supportsWebGpu: SpeechWorkerDependencies['supportsWebGpu'] = () => {
  return task.tryOrElse(toSpeechError, async () => {
    const gpu: unknown = Reflect.get(navigator, 'gpu');
    const requestAdapter: unknown = isObject(gpu) ? Reflect.get(gpu, 'requestAdapter') : undefined;
    if (!isFunction(requestAdapter)) {
      return false;
    }
    return !isNullOrUndefined(await requestAdapter.call(gpu));
  });
};

const createTranscriber: SpeechWorkerDependencies['createTranscriber'] = ({model, device, onProgress}) => {
  return task.tryOrElse(toSpeechError, async (): Promise<SpeechTranscriber> => {
    const transcriber = await pipeline<'automatic-speech-recognition'>(
      'automatic-speech-recognition',
      speechModelDirectory(model),
      {
        device,
        dtype: device === 'webgpu' ? {encoder_model: 'fp32', decoder_model_merged: 'q4'} : 'q8',
        progress_callback(progress: unknown) {
          const parsed = downloadProgressSchema.safeParse(progress);
          if (parsed.success) {
            onProgress({
              phase: 'download',
              file: parsed.data.file,
              percent: Math.min(fullProgressPercent, Math.max(0, parsed.data.progress)),
            });
          }
        },
      },
    );
    return {
      warmup() {
        return task.tryOrElse(toSpeechError, async () => {
          await transcriber(new Float32Array(sampleRate), {max_new_tokens: 1});
        });
      },
      transcribe(audio, language): Task<string, Error> {
        return task.tryOrElse(toSpeechError, async () => {
          const output = await transcriber(audio, {...(language === 'auto' ? {} : {language}), task: 'transcribe'});
          return Array.isArray(output)
            ? output
                .map(part => {
                  return part.text;
                })
                .join(' ')
            : output.text;
        });
      },
      dispose() {
        return task.tryOrElse(toSpeechError, () => {
          return transcriber.dispose();
        });
      },
    };
  });
};

const processor = createSpeechWorkerProcessor({
  supportsWebGpu,
  createTranscriber,
  respond(message) {
    self.postMessage(message);
  },
});
const fireAndForgetInvoker = createFireAndForgetInvoker({
  reportError() {
    self.postMessage({type: 'error', message: 'Unexpected speech worker failure'});
    self.close();
  },
});
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  fireAndForgetInvoker.fireAndForget(async () => {
    const handled = await processor.receive(event.data);
    if (handled.isErr) {
      self.postMessage({type: 'error', message: handled.error.message.slice(0, maxSpeechMessageLength)});
    }
  });
});
