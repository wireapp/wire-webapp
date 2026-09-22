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

import {AuthAction, authAction} from './authAction';
import {ClientAction, clientAction} from './clientAction';
import {ConversationAction, conversationAction} from './conversationAction';
import {InvitationAction, invitationAction} from './invitationAction';
import {LocalStorageAction, localStorageAction} from './localStorageAction';
import {NavigationAction, navigationAction} from './navigationAction';
import {NotificationAction, notificationAction} from './notificationAction';
import {SelfAction, selfAction} from './selfAction';
import {UserAction, userAction} from './userAction';
import {WrapperEventAction, wrapperEventAction} from './wrapperEventAction';

export interface ActionRoot {
  authAction: AuthAction;
  clientAction: ClientAction;
  conversationAction: ConversationAction;
  invitationAction: InvitationAction;
  localStorageAction: LocalStorageAction;
  navigationAction: NavigationAction;
  notificationAction: NotificationAction;
  selfAction: SelfAction;
  userAction: UserAction;
  wrapperEventAction: WrapperEventAction;
}

export const actionRoot: ActionRoot = {
  authAction,
  clientAction,
  conversationAction,
  invitationAction,
  localStorageAction,
  navigationAction,
  notificationAction,
  selfAction,
  userAction,
  wrapperEventAction,
};
