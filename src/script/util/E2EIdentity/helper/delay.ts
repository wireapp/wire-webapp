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

export const ONE_MINUTE = 60000;
export const FIFTEEN_MINUTES = 900000;
export const ONE_HOUR = 3600000;
export const TWO_HOURS = 7200000;
export const FOUR_HOURS = 14400000;
export const ONE_DAY = 86400000;

export function getDelayTime(gracePeriodInMs: number): number {
  if (gracePeriodInMs > 0) {
    if (gracePeriodInMs <= FIFTEEN_MINUTES) {
      return Math.min(ONE_MINUTE / 2, gracePeriodInMs);
    } else if (gracePeriodInMs <= ONE_HOUR) {
      return Math.min(FIFTEEN_MINUTES, gracePeriodInMs);
    } else if (gracePeriodInMs <= FOUR_HOURS) {
      return Math.min(ONE_HOUR, gracePeriodInMs);
    } else if (gracePeriodInMs <= ONE_DAY) {
      return Math.min(TWO_HOURS, gracePeriodInMs);
    }
    return Math.min(ONE_DAY, gracePeriodInMs);
  }
  return 0;
}
