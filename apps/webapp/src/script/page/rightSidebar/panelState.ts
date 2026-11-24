/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {Conversation} from '../../repositories/entity/Conversation';
import {Message} from '../../repositories/entity/message/message';
import {User} from '../../repositories/entity/User';
import {ServiceEntity} from '../../repositories/integration/ServiceEntity';

export enum PanelState {
  ADD_PARTICIPANTS = 'ADD_PARTICIPANTS',
  CONVERSATION_DETAILS = 'CONVERSATION_DETAILS',
  CONVERSATION_PARTICIPANTS = 'CONVERSATION_PARTICIPANTS',
  GROUP_PARTICIPANT_SERVICE = 'GROUP_PARTICIPANT_SERVICE',
  GROUP_PARTICIPANT_USER = 'GROUP_PARTICIPANT_USER',
  GUEST_OPTIONS = 'GUEST_OPTIONS',
  MESSAGE_DETAILS = 'MESSAGE_DETAILS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  PARTICIPANT_DEVICES = 'DEVICES',
  SERVICES_OPTIONS = 'SERVICES_OPTIONS',
  SHARED_DRIVE = 'SHARED_DRIVE',
  TIMED_MESSAGES = 'TIMED_MESSAGES',
  ACCESS = 'ACCESS',
  CONVERSATION_HISTORY = 'CONVERSATION_HISTORY',
}

export type PanelEntity = Conversation | User | Message | ServiceEntity;

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showReactions?: boolean;
  highlighted?: User[];
};
