/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export class WebWorker {
  #worker: Worker | undefined;

  /**
   * worker wrapper that will lazy load (a single time) the worker only when it's needed
   *
   * @param workerCreator the creation function that will instanciate the worker (only called when the worker is needed)
   */
  constructor(private workerCreator: () => Worker) {}

  private get worker(): Worker {
    if (!this.#worker) {
      this.#worker = this.workerCreator();
    }
    return this.#worker;
  }

  post<T>(data: string | ArrayBuffer | Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = event => resolve(event.data);
      this.worker.onerror = error => reject(error);
      this.worker.postMessage(data);
    });
  }
}
