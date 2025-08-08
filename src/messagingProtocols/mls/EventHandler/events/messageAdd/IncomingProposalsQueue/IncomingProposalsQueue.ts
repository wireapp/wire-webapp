/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
import {Task, PromiseQueue} from '@wireapp/promise-queue';

const logger = LogFactory.getLogger('@wireapp/core/mls/IncomingProposalsQueue');

const proposalsQueue = new PromiseQueue({name: 'incoming-proposals-queue', paused: true});

export function queueProposal<T>(cb: Task<T>): Promise<T> {
  logger.info('Queueing proposal for processing');
  return proposalsQueue.push(cb);
}

export function resumeProposalProcessing(): void {
  logger.info('Resuming proposal processing');
  proposalsQueue.pause(false);
}

export function pauseProposalProcessing(): void {
  logger.info('Pausing proposal processing');
  proposalsQueue.pause(true);
}
