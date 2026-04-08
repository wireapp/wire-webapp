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

import {CONVERSATION_EVENT} from './conversationEvent';
import {FEDERATION_EVENT} from './federationEvent';
import {TEAM_EVENT} from './teamEvent';
import {USER_EVENT} from './userEvent';
import {USER_GROUP_EVENT, UserGroupEvent} from './userGroupEvent';

import {ConversationEvent, TeamEvent, UserEvent, FederationEvent} from '.';

export type BackendEvent = ConversationEvent | UserEvent | TeamEvent | FederationEvent | UserGroupEvent;
export type BackendEventType = CONVERSATION_EVENT | USER_EVENT | TEAM_EVENT | FEDERATION_EVENT | USER_GROUP_EVENT;
