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

import {
  TeamConversationCreateData,
  TeamConversationDeleteData,
  TeamMemberLeaveData,
  TeamUpdateData,
} from '../team/data';

export enum TEAM_EVENT {
  CONVERSATION_CREATE = 'team.conversation-create',
  CONVERSATION_DELETE = 'team.conversation-delete',
  CREATE = 'team.create',
  DELETE = 'team.delete',
  MEMBER_JOIN = 'team.member-join',
  MEMBER_LEAVE = 'team.member-leave',
  MEMBER_UPDATE = 'team.member-update',
  UPDATE = 'team.update',
}

export interface TeamEvent {
  type: TEAM_EVENT;
}

export interface TeamConversationCreateEvent extends TeamEvent {
  type: TEAM_EVENT.CONVERSATION_CREATE;
}

export interface TeamConversationCreateNotification {
  data: TeamConversationCreateData;
  team: string;
  time: string;
  type: TEAM_EVENT.CONVERSATION_CREATE;
}

export interface TeamConversationDeleteEvent extends TeamEvent {
  type: TEAM_EVENT.CONVERSATION_DELETE;
}

export interface TeamConversationDeleteNotification {
  data: TeamConversationDeleteData;
  team: string;
  time: string;
  type: TEAM_EVENT.CONVERSATION_DELETE;
}

export interface TeamCreateEvent extends TeamEvent {
  type: TEAM_EVENT.CREATE;
}

export interface TeamDeleteEvent extends TeamEvent {
  type: TEAM_EVENT.DELETE;
}

export interface TeamMemberJoinEvent extends TeamEvent {
  type: TEAM_EVENT.MEMBER_JOIN;
}

export interface TeamMemberLeaveEvent extends TeamEvent {
  type: TEAM_EVENT.MEMBER_LEAVE;
}

export interface TeamMemberLeaveNotification {
  data: TeamMemberLeaveData;
  team: string;
  time: string;
  type: TEAM_EVENT.MEMBER_LEAVE;
}

export interface TeamMemberUpdateEvent extends TeamEvent {
  type: TEAM_EVENT.MEMBER_UPDATE;
}

export interface TeamUpdateEvent extends TeamEvent {
  type: TEAM_EVENT.UPDATE;
}

export interface TeamUpdateNotification {
  data: TeamUpdateData;
  team: string;
  time: string;
  type: TEAM_EVENT.UPDATE;
}
