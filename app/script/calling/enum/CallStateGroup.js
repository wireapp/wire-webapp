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

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.enum = z.calling.enum || {};

z.calling.enum.CALL_STATE_GROUP = {
  CAN_CONNECT: [
    z.calling.enum.CALL_STATE.INCOMING,
    z.calling.enum.CALL_STATE.ONGOING,
    z.calling.enum.CALL_STATE.REJECTED,
  ],
  CAN_JOIN: [z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.REJECTED],
  IS_ACTIVE: [
    z.calling.enum.CALL_STATE.CONNECTING,
    z.calling.enum.CALL_STATE.DISCONNECTING,
    z.calling.enum.CALL_STATE.INCOMING,
    z.calling.enum.CALL_STATE.ONGOING,
    z.calling.enum.CALL_STATE.OUTGOING,
  ],
  IS_ENDED: [z.calling.enum.CALL_STATE.ENDED, z.calling.enum.CALL_STATE.UNKNOWN],
  UNANSWERED: [z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.OUTGOING],
};
