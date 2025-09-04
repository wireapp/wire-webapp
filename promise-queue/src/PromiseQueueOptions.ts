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

export interface PromiseQueueOptions {
  /** Concurrent promise execution. Default is 1. */
  concurrent?: number;
  /** Name for Promise queue */
  name: string;
  /** Initial paused state. Default is `false`. */
  paused?: boolean;
  /** Timeout in ms. Default is 1000 (1 minute). */
  timeout?: number;
  /** logger used to log errors */
  logger?: {warn: (...args: any[]) => void};
}
