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

import {LogFactory} from '../../../../commons/LogFactory';
import {TimeUtil} from '../../../../commons/util';

export const DEFAULT_BUFFERED_MLS_MESSAGE_RECOVERY_THRESHOLD_MS = TimeUtil.TimeInMillis.MINUTE;

type TimestampRange = {
  earliest: number;
  latest: number;
};

/**
 * Tracks prolonged CoreCrypto MLS message buffering so the client can initiate stale epoch recovery.
 *
 * When a commit is missed, CoreCrypto keeps buffering later messages (BufferedFutureMessage / BufferedCommit)
 * until the epoch gap is large enough to be reported as a wrong epoch. In conversations where the epoch rarely
 * changes (e.g. 1:1 conversations) that never happens, so the conversation stays stuck.
 *
 * Buffered event timestamps are tracked per MLS group (conversations and subconversations have distinct group ids).
 * Recovery is requested when their timestamp span exceeds the threshold, allowing short-lived out-of-order delivery
 * to resolve without intervention. Once triggered, recovery keeps being requested for every further buffered message
 * until {@link clear} is called, so a failed recovery attempt is retried with the next buffered message.
 * Tracking is kept in memory only and does not survive a reload.
 */
export class BufferedMlsMessageRecoveryTracker {
  private readonly bufferedMessageRanges = new Map<string, TimestampRange>();
  private readonly logger = LogFactory.getLogger('@wireapp/core/BufferedMlsMessageRecoveryTracker');

  constructor(private readonly recoveryThresholdMs: number = DEFAULT_BUFFERED_MLS_MESSAGE_RECOVERY_THRESHOLD_MS) {}

  /**
   * Records a buffered message for the given group.
   * @param groupId base64 encoded MLS group id
   * @param timestamp timestamp (ms since epoch) of the event carrying the buffered message
   * @returns whether stale epoch recovery should be initiated for the group
   */
  public observeBufferedMessage(groupId: string, timestamp: number): boolean {
    const previousRange = this.bufferedMessageRanges.get(groupId);
    const updatedRange: TimestampRange =
      previousRange === undefined
        ? {earliest: timestamp, latest: timestamp}
        : {earliest: Math.min(previousRange.earliest, timestamp), latest: Math.max(previousRange.latest, timestamp)};

    const bufferedTimeSpanMs = updatedRange.latest - updatedRange.earliest;
    const shouldRecover = bufferedTimeSpanMs > this.recoveryThresholdMs;

    this.bufferedMessageRanges.set(groupId, updatedRange);

    this.logger.info(
      shouldRecover ? 'Buffered MLS message recovery triggered' : 'Buffered MLS message recovery tracking updated',
      {
        groupId,
        messageTimestamp: new Date(timestamp).toISOString(),
        earliestBufferedTimestamp: new Date(updatedRange.earliest).toISOString(),
        latestBufferedTimestamp: new Date(updatedRange.latest).toISOString(),
        bufferedTimeSpanMs,
        recoveryThresholdMs: this.recoveryThresholdMs,
      },
    );

    return shouldRecover;
  }

  /** Stops tracking buffered messages for the given group (e.g. after successful decryption or recovery). */
  public clear(groupId: string): void {
    const removedRange = this.bufferedMessageRanges.get(groupId);
    if (removedRange === undefined) {
      return;
    }

    this.bufferedMessageRanges.delete(groupId);
    this.logger.info('Buffered MLS message recovery tracking cleared', {
      groupId,
      earliestBufferedTimestamp: new Date(removedRange.earliest).toISOString(),
      latestBufferedTimestamp: new Date(removedRange.latest).toISOString(),
    });
  }
}
