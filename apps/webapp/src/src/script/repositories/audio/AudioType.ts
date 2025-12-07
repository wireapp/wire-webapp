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

export enum AudioType {
  CALL_DROP = 'call_drop',
  INCOMING_CALL = 'ringing_from_them',
  INCOMING_PING = 'ping_from_them',
  NETWORK_INTERRUPTION = 'nw_interruption',
  NEW_MESSAGE = 'new_message',
  OUTGOING_CALL = 'ringing_from_me',
  OUTGOING_PING = 'ping_from_me',
  READY_TO_TALK = 'ready_to_talk',
  TALK_LATER = 'talk_later',
}
