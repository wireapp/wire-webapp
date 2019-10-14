/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Priority} from './Priority';

export class Item {
  /** original business logic */
  fn: Function = () => {};
  label: string | undefined;
  priority: number = Priority.MEDIUM;
  /** wrapped `reject` of `fn` */
  reject: Function = () => {};
  /** wrapped `resolve` of `fn` */
  resolve: Function = () => {};
  /** number of remaining retries for rejecting Promises */
  retry: number = Infinity;
  /** time when the item has been added to the queue */
  timestamp: number = 0;

  public toString(): string {
    return `
    label=${this.label},
    priority=${this.priority},
    timestamp=${this.timestamp},
    retry=${this.retry},
    fn=${this.fn.toString().replace(/(\r\n|\n|\r|\s+)/gm, ' ')},`;
  }
}
