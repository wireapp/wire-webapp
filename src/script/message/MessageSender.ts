/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {PromiseFn, PromiseQueue} from '../util/PromiseQueue';

export class MessageSender {
  private readonly sendingQueue: PromiseQueue;

  constructor() {
    this.sendingQueue = new PromiseQueue({name: 'MessageSender', paused: true});
  }

  get queuedMessages(): number {
    return this.sendingQueue.getLength();
  }

  queueMessage<T>(sendingFunction: PromiseFn<T>): Promise<T> {
    return this.sendingQueue.push(sendingFunction);
  }

  pauseQueue(pauseState: boolean): void {
    this.sendingQueue.pause(pauseState);
  }
}
