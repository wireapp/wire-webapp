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

enum PERSONAL {
  GROUP = 'z.conversation.ACCESS_STATE.PERSONAL.GROUP',
  ONE2ONE = 'z.conversation.ACCESS_STATE.PERSONAL.ONE2ONE',
}

export enum TEAM {
  GUEST_ROOM = 'z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM',
  LEGACY = 'z.conversation.ACCESS_STATE.TEAM.LEGACY',
  ONE2ONE = 'z.conversation.ACCESS_STATE.TEAM.ONE2ONE',
  TEAM_ONLY = 'z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY',
}

export const ACCESS_STATE = {
  PERSONAL,
  SELF: 'z.conversation.ACCESS_STATE.SELF',
  TEAM,
  UNKNOWN: 'z.conversation.ACCESS_STATE.UNKNOWN',
};
