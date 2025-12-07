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

import {AuthAction, authAction} from './AuthAction';
import {ClientAction, clientAction} from './ClientAction';
import {ConversationAction, conversationAction} from './ConversationAction';
import {InvitationAction, invitationAction} from './InvitationAction';
import {LocalStorageAction, localStorageAction} from './LocalStorageAction';
import {NavigationAction, navigationAction} from './NavigationAction';
import {NotificationAction, notificationAction} from './NotificationAction';
import {SelfAction, selfAction} from './SelfAction';
import {UserAction, userAction} from './UserAction';
import {WrapperEventAction, wrapperEventAction} from './WrapperEventAction';

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
