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

export class ProteusError extends Error {
  static CODE: Record<string, number> = {
    CASE_100: 100,
    CASE_101: 101,
    CASE_102: 102,
    CASE_103: 103,
    CASE_104: 104,
  };

  constructor(public message: string, public code = 1) {
    super(message);
    Object.setPrototypeOf(this, ProteusError.prototype);

    this.code = code;
    this.message = message;
    this.name = this.constructor.name;
  }
}
