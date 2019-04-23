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

import {CALL_STATE} from './CallState';

export const CALL_STATE_GROUP = {
  CAN_CONNECT: [CALL_STATE.INCOMING, CALL_STATE.ONGOING, CALL_STATE.REJECTED],
  CAN_JOIN: [CALL_STATE.INCOMING, CALL_STATE.REJECTED],
  IS_ACTIVE: [
    CALL_STATE.CONNECTING,
    CALL_STATE.DISCONNECTING,
    CALL_STATE.INCOMING,
    CALL_STATE.ONGOING,
    CALL_STATE.OUTGOING,
  ],
  IS_ENDED: [CALL_STATE.ENDED, CALL_STATE.UNKNOWN],
  UNANSWERED: [CALL_STATE.INCOMING, CALL_STATE.OUTGOING],
};
