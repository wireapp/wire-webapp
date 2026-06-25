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

import {AuthAction, authAction} from './authaction';
import {ClientAction, clientAction} from './clientaction';
import {ConversationAction, conversationAction} from './conversationaction';
import {InvitationAction, invitationAction} from './invitationaction';
import {LocalStorageAction, localStorageAction} from './localstorageaction';
import {NavigationAction, navigationAction} from './navigationaction';
import {NotificationAction, notificationAction} from './notificationaction';
import {SelfAction, selfAction} from './selfaction';
import {UserAction, userAction} from './useraction';
import {WrapperEventAction, wrapperEventAction} from './wrappereventaction';

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
