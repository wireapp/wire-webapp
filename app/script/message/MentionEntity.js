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

'use strict';

window.z = window.z || {};
window.z.message = z.message || {};

z.message.Mention = class Mention {
  constructor(start, end, userId = '') {
    this.end = end;
    this.start = start;

    this.userId = userId;
  }

  toJSON() {
    return {
      end: this.end,
      start: this.start,
      userId: this.userId,
    };
  }

  toProto() {
    const mention = new z.proto.Mention(this.start, this.end);
    if (this.userId) {
      mention.set('user_id', this.userId);
    }
    return mention;
  }
};
