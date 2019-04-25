/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export enum CALL_TYPE {
  NORMAL = 0,
  VIDEO = 1,
  FORCED_AUDIO = 2,
}

export enum CONVERSATION_TYPE {
  ONEONONE = 0,
  GROUP = 1,
  CONFERENCE = 2,
}

export enum CALL_STATE {
  NONE = 0 /* There is no call */,
  OUTGOING = 1 /* Outgoing call is pending */,
  INCOMING = 2 /* Incoming call is pending */,
  ANSWERED = 3 /* Call has been answered, but no media */,
  MEDIA_ESTAB = 4 /* Call has been answered, with media */,
  TERM_LOCAL = 6 /* Call was locally terminated */,
  TERM_REMOTE = 7 /* Call was remotely terminated */,
  UNKNOWN = 8 /* Unknown */,
}
