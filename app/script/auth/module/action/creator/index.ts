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

import {Action} from 'redux';
import {AuthActions} from './AuthActionCreator';
import {ClientActions} from './ClientActionCreator';
import {ConversationActions} from './ConversationActionCreator';
import {CookieActions} from './CookieActionCreator';
import {InvitationActions} from './InvitationActionCreator';
import {LanguageActions} from './LanguageActionCreator';
import {LocalStorageActions} from './LocalStorageActionCreator';
import {NotificationActions} from './NotificationActionCreator';
import {RuntimeActions} from './RuntimeActionCreator';
import {SelfActions} from './SelfActionCreator';
import {UserActions} from './UserActionCreator';

export interface AppAction extends Action {
  type: string;
}

export type AppActions =
  | AuthActions
  | ClientActions
  | ConversationActions
  | CookieActions
  | InvitationActions
  | LanguageActions
  | LocalStorageActions
  | NotificationActions
  | RuntimeActions
  | SelfActions
  | UserActions;

export * from './AuthActionCreator';
export * from './ClientActionCreator';
export * from './ConversationActionCreator';
export * from './CookieActionCreator';
export * from './InvitationActionCreator';
export * from './LanguageActionCreator';
export * from './LocalStorageActionCreator';
export * from './NotificationActionCreator';
export * from './RuntimeActionCreator';
export * from './SelfActionCreator';
export * from './UserActionCreator';
