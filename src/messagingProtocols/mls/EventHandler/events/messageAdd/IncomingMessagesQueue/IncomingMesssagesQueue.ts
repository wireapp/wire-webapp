/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {LogFactory} from '@wireapp/commons';
import {PromiseQueue} from '@wireapp/promise-queue';

const logger = LogFactory.getLogger('@wireapp/core/MLSService/IncomingMessagesQueue');

// (groupId string -> queue) map
const queues = new Map<string, PromiseQueue>();

const getQueue = (groupId: string) => {
  const queue = queues.get(groupId);

  if (queue) {
    return queue;
  }

  const newConversationQueue = new PromiseQueue({
    name: `mls-messages-queue-${groupId}`,
  });
  queues.set(groupId, newConversationQueue);

  return newConversationQueue;
};

export const queueIncomingMLSMessage = async <EventHandler extends (...args: any[]) => any>(
  groupId: string,
  handler: EventHandler,
): Promise<ReturnType<EventHandler>> => {
  const conversationQueue = getQueue(groupId);
  return conversationQueue.push(handler);
};

export const deleteMLSMessagesQueue = (groupId: string) => {
  queues.delete(groupId);
};

const lockMLSMessagesQueue = (groupId: string) => {
  logger.info(`Locking incoming MLS messages queue for group ${groupId}`);
  const conversationQueue = getQueue(groupId);
  conversationQueue.pause();
};

const unlockMLSMessagesQueue = (groupId: string) => {
  logger.info(`Unlocking incoming MLS messages queue for group ${groupId}`);
  const conversationQueue = getQueue(groupId);
  conversationQueue.resume();
};

export const withLockedMLSMessagesQueue = async <T>(groupId: string, fn: () => Promise<T>): Promise<T> => {
  lockMLSMessagesQueue(groupId);
  try {
    const result = await fn();
    unlockMLSMessagesQueue(groupId);
    return result;
  } catch (error) {
    unlockMLSMessagesQueue(groupId);
    throw error;
  }
};
