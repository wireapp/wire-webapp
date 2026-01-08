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

/**
 * Converts a timestamp to monotonic milliseconds, ensuring it never decreases.
 *
 * Ensures timestamps are strictly increasing by:
 * 1. Converting seconds to milliseconds
 * 2. Ensuring it's at least 1ms greater than the last timestamp
 * 3. Ensuring it's not in the past (at least current time)
 *
 * This prevents issues with non-monotonic timestamps from video sources
 * that can cause problems with temporal smoothing and frame ordering.
 *
 * @param sourceTimestampSeconds - Source timestamp in seconds.
 * @param lastTimestampMs - Last processed timestamp in milliseconds.
 * @param nowMs - Current time in milliseconds (defaults to performance.now()).
 * @returns Monotonic timestamp in milliseconds.
 */
export const toMonotonicTimestampMs = (
  sourceTimestampSeconds: number,
  lastTimestampMs: number,
  nowMs: number = performance.now(),
): number => {
  const candidate = Math.floor(sourceTimestampSeconds * 1000);
  return Math.max(candidate, lastTimestampMs + 1, Math.floor(nowMs));
};
