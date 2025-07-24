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

import {MessageAddEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage';

export function getCommonMessageUpdates(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
  return {
    ...newEvent,
    data: {...newEvent.data, expects_read_confirmation: originalEvent.data.expects_read_confirmation},
    edited_time: originalEvent.edited_time,
    read_receipts: !newEvent.read_receipts ? originalEvent.read_receipts : newEvent.read_receipts,
    status: !newEvent.status || newEvent.status < originalEvent.status ? originalEvent.status : newEvent.status,
    time: originalEvent.time,
  };
}
