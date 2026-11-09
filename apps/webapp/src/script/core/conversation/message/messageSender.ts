/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import PromiseQueue from 'p-queue';

import {sequentialQueueOptions} from '../../queue/sequentialQueueOptions';

type PromiseTask<T> = () => Promise<T>;

const sendingQueue = new PromiseQueue({autoStart: false, ...sequentialQueueOptions});

export function sendMessage<T>(sendingFunction: PromiseTask<T>): Promise<T> {
  return sendingQueue.add(sendingFunction);
}

export function getQueueLength(): number {
  return sendingQueue.size;
}

export function isSendingMessage(): boolean {
  return sendingQueue.pending > 0;
}

export function resumeMessageSending(): void {
  sendingQueue.start();
}

export function pauseMessageSending(): void {
  sendingQueue.pause();
}
