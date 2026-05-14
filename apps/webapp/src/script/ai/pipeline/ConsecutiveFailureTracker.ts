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

export class ConsecutiveFailureTracker {
  private count = 0;

  constructor(private readonly threshold = 3) {}

  /** Reset the failure counter. */
  reset(): void {
    this.count = 0;
  }

  /** Record a success, resetting the failure counter. */
  recordSuccess(): void {
    this.count = 0;
  }

  /** Record a failure. Returns true if threshold is reached, signaling caller to halt scan. */
  recordFailure(): boolean {
    this.count += 1;
    return this.count >= this.threshold;
  }
}
