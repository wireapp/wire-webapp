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

import {Maybe} from 'true-myth';

import type {CellsBackgroundActionPollingPolicy} from './cellsBackgroundActionPolling';

const POLL_INTERVAL_MS = 1000;
const RETRY_BACKOFF_FACTOR = 2;
const RETRY_MIN_JITTER_FACTOR = 0.75;
const RETRY_MAX_JITTER_FACTOR = 1.25;
const MAX_UNKNOWN_RETRIES = 5;

export const createBulkJobPollingPolicy = (random: () => number): CellsBackgroundActionPollingPolicy => {
  return {
    pollIntervalMs: POLL_INTERVAL_MS,
    maxUnknownRetries: MAX_UNKNOWN_RETRIES,
    maxPollAttempts: Maybe.nothing(),
    getUnknownRetryDelay: retryIndex => {
      return (
        POLL_INTERVAL_MS *
        RETRY_BACKOFF_FACTOR ** retryIndex *
        (RETRY_MIN_JITTER_FACTOR + random() * (RETRY_MAX_JITTER_FACTOR - RETRY_MIN_JITTER_FACTOR))
      );
    },
  };
};
