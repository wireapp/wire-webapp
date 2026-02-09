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

import {BackendEvent} from '../event';

export interface Notification {
  id: string;
  payload: BackendEvent[];
  /**
   * Whether the notification is transient, i.e. not stored in the notification queue.
   * The `transient` property is only set when notifications arrive through the WebSocket.
   * Notifications from the notification stream don't have that property.
   * @see https://github.com/wearezeta/backend-api-docs/wiki/API-User-Notifications#notification-structure
   */
  transient?: boolean;
}
