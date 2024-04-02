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

import {FeatureList} from '../team';
import {
  TeamConversationCreateData,
  TeamConversationDeleteData,
  TeamFeatureConfigurationUpdateEventData,
  TeamMemberJoinData,
  TeamMemberLeaveData,
  TeamMemberUpdateData,
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
  FEATURE_CONFIG_UPDATE = 'feature-config.update',
}

export type TeamEventData =
  | TeamConversationCreateData
  | TeamConversationDeleteData
  | TeamMemberLeaveData
  | TeamMemberUpdateData
  | TeamUpdateData
  | TeamFeatureConfigurationUpdateEventData<keyof FeatureList>
  | null;

export type TeamEvent =
  | TeamConversationCreateEvent
  | TeamConversationDeleteEvent
  | TeamCreateEvent
  | TeamDeleteEvent
  | TeamMemberJoinEvent
  | TeamMemberLeaveEvent
  | TeamMemberUpdateEvent
  | TeamFeatureConfigurationUpdateEvent
  | TeamUpdateEvent;

export interface BaseTeamEvent {
  data: TeamEventData;
  team: string;
  time: string;
  type: TEAM_EVENT;
}

export interface TeamConversationCreateEvent extends BaseTeamEvent {
  data: TeamConversationCreateData;
  type: TEAM_EVENT.CONVERSATION_CREATE;
}

export interface TeamConversationDeleteEvent extends BaseTeamEvent {
  data: TeamConversationDeleteData;
  type: TEAM_EVENT.CONVERSATION_DELETE;
}

export interface TeamCreateEvent extends BaseTeamEvent {
  // TODO: add data
  type: TEAM_EVENT.CREATE;
}

export interface TeamDeleteEvent extends BaseTeamEvent {
  data: null;
  type: TEAM_EVENT.DELETE;
}

export interface TeamMemberJoinEvent extends BaseTeamEvent {
  data: TeamMemberJoinData;
  type: TEAM_EVENT.MEMBER_JOIN;
}

export interface TeamMemberLeaveEvent extends BaseTeamEvent {
  data: TeamMemberLeaveData;
  type: TEAM_EVENT.MEMBER_LEAVE;
}

export interface TeamMemberUpdateEvent extends BaseTeamEvent {
  data: TeamMemberUpdateData;
  type: TEAM_EVENT.MEMBER_UPDATE;
}

export interface TeamUpdateEvent extends BaseTeamEvent {
  data: TeamUpdateData;
  type: TEAM_EVENT.UPDATE;
}

export type TeamFeatureConfigurationUpdateEvent = Omit<BaseTeamEvent, 'data'> &
  {
    [FeatureKey in keyof FeatureList]: {
      name: FeatureKey;
      data: TeamFeatureConfigurationUpdateEventData<FeatureKey>;
      type: TEAM_EVENT.FEATURE_CONFIG_UPDATE;
    };
  }[keyof FeatureList];
