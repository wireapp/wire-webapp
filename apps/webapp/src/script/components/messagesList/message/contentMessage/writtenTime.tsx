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

import {CSSObject} from '@emotion/react';

/** Five minutes. Not taken from the time helpers: they would pull this module into the cycle of the content message */
const WRITTEN_TIME_SHOWN_AFTER_MILLISECONDS = 300_000;

export const writtenTimeStyles: CSSObject = {
  marginLeft: '4px',
  color: 'var(--content-message-timestamp)',
};

type ShouldShowWrittenTimeOptions = {
  readonly sendingState: 'sent' | 'outgoing' | 'failed';
  /** Unix timestamp in milliseconds */
  readonly sentTimestamp: number;
  /** Unix timestamp in milliseconds; `NaN` when the message has no written time */
  readonly writtenTimestamp: number;
};

/** A message sent at least five minutes after it was written says when it was written */
export function shouldShowWrittenTime(options: ShouldShowWrittenTimeOptions): boolean {
  const {sendingState, sentTimestamp, writtenTimestamp} = options;
  return (
    sendingState === 'sent' &&
    Number.isFinite(writtenTimestamp) &&
    sentTimestamp - writtenTimestamp >= WRITTEN_TIME_SHOWN_AFTER_MILLISECONDS
  );
}
