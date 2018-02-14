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
window.z.conversation = z.conversation || {};

z.conversation.TIMESTAMP_TYPE = {
  ARCHIVED: 'z.conversation.TIMESTAMP_TYPE.ARCHIVED',
  CLEARED: 'z.conversation.TIMESTAMP_TYPE.CLEARED',
  LAST_EVENT: 'z.conversation.TIMESTAMP_TYPE.LAST_EVENT',
  LAST_READ: 'z.conversation.TIMESTAMP_TYPE.LAST_READ',
  LAST_SERVER: 'z.conversation.TIMESTAMP_TYPE.LAST_SERVER',
  MUTED: 'z.conversation.TIMESTAMP_TYPE.MUTED',
};
