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

/** Engines accept mono 16 kHz PCM. Implement this interface to plug in another runtime. */
export interface SpeechEngine {
  load(model: string, onProgress: (message: string) => void): Promise<void>;
  transcribe(audio: Float32Array): Promise<string>;
  dispose(): void;
}

export class WhisperWorkerEngine implements SpeechEngine {
  private worker?: Worker;
  private pending?: {resolve: (text: string) => void; reject: (error: Error) => void};

  load(model: string, onProgress: (message: string) => void): Promise<void> {
    // Creating the worker is the first point at which the inference library loads.
    const worker = new Worker(new URL('./speechWorker.ts', import.meta.url));
    this.worker = worker;
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') {
        onProgress(data.message);
        return;
      }
      const pending = this.pending;
      this.pending = undefined;
      if (data.type === 'error') {
        pending?.reject(new Error(data.message));
      } else {
        pending?.resolve(data.text ?? '');
      }
    };
    worker.onerror = event => {
      this.pending?.reject(new Error(event.message.length > 0 ? event.message : 'Speech worker failed'));
      this.pending = undefined;
    };
    return new Promise<void>((resolve, reject) => {
      this.pending = {
        resolve: () => {
          return resolve();
        },
        reject,
      };
      worker.postMessage({type: 'load', model});
    });
  }

  transcribe(audio: Float32Array): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pending = {resolve, reject};
      this.worker?.postMessage({type: 'transcribe', audio}, [audio.buffer]);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.pending?.reject(new Error('Note taker stopped'));
    this.pending = undefined;
  }
}
