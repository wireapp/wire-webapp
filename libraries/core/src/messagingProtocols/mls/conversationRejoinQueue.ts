/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Task, PromiseQueue} from '@wireapp/promise-queue';

const sendingQueue = new PromiseQueue({name: 'mls-conversation-rejoin', paused: false});

const queuedJobs = new Set<string>();

/**
 * Will queue a rejoin task for a conversation. This could be useful if conversation is out of sync with current epoch
 * @param groupId the groupId in which we will trigger the rejoin (will be used as ID, in order not to add another rejoin task for the same conversation if it's already in the queue)
 * @param rejoinFn the function to be executed to trigger the rejoin
 */
export async function queueConversationRejoin<T>(groupId: string, rejoinFn: Task<T>): Promise<T | void> {
  if (!queuedJobs.has(groupId)) {
    queuedJobs.add(groupId);

    const result = await sendingQueue.push(rejoinFn);
    queuedJobs.delete(groupId);
    return result;
  }
}

export function resumeRejoiningMLSConversations(): void {
  sendingQueue.resume();
}

export function pauseRejoiningMLSConversations(): void {
  sendingQueue.pause();
}
