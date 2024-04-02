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

import {
  TeamConversationCreateData,
  TeamConversationDeleteData,
  TeamMemberJoinData,
  TeamMemberLeaveData,
  TeamUpdateData,
} from '@wireapp/api-client/lib/team/data';

import {BasePayloadBundle, PayloadBundleType} from './PayloadBundle';

export interface TeamConversationCreateMessage extends BasePayloadBundle {
  content: TeamConversationCreateData;
  type: PayloadBundleType.TEAM_CONVERSATION_CREATE;
}

export interface TeamMemberLeaveMessage extends BasePayloadBundle {
  content: TeamMemberLeaveData;
  type: PayloadBundleType.TEAM_MEMBER_LEAVE;
}

export interface TeamConversationDeleteMessage extends BasePayloadBundle {
  content: TeamConversationDeleteData;
  type: PayloadBundleType.TEAM_CONVERSATION_DELETE;
}

export interface TeamDeleteMessage extends BasePayloadBundle {
  content: null;
  type: PayloadBundleType.TEAM_DELETE;
}

export interface TeamMemberJoinMessage extends BasePayloadBundle {
  content: TeamMemberJoinData;
  type: PayloadBundleType.TEAM_MEMBER_JOIN;
}

export interface TeamMemberLeaveMesssage extends BasePayloadBundle {
  content: TeamMemberLeaveData;
  type: PayloadBundleType.TEAM_MEMBER_LEAVE;
}

export interface TeamUpdateMessage extends BasePayloadBundle {
  content: TeamUpdateData;
  type: PayloadBundleType.TEAM_UPDATE;
}

export type TeamMessage =
  | TeamConversationCreateMessage
  | TeamMemberLeaveMessage
  | TeamConversationDeleteMessage
  | TeamDeleteMessage
  | TeamMemberJoinMessage
  | TeamMemberLeaveMesssage
  | TeamUpdateMessage;
