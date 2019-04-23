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

export enum TERMINATION_REASON {
  COMPLETED = 'completed',
  CONCURRENT_CALL = 'concurrent',
  CONNECTION_DROP = 'drop',
  CONNECTION_FAILED = 'failed_ice',
  GROUP_CHECK = 'group_check',
  MEMBER_LEAVE = 'member_leave',
  MISSED = 'missed',
  OTHER_USER = 'other',
  PAGE_NAVIGATION = 'page_navigation',
  RENEGOTIATION = 'renegotiation',
  SDP_FAILED = 'failed_sdp',
  SELF_USER = 'self',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}
