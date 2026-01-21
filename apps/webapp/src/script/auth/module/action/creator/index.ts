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

import type {Action} from 'redux';

import type {AuthActions} from './AuthActionCreator';
import type {ClientActions} from './ClientActionCreator';
import type {ConversationActions} from './ConversationActionCreator';
import type {InvitationActions} from './InvitationActionCreator';
import type {LanguageActions} from './LanguageActionCreator';
import type {LocalStorageActions} from './LocalStorageActionCreator';
import type {SelfActions} from './SelfActionCreator';
import type {UserActions} from './UserActionCreator';

export interface AppAction extends Action {
  type: string;
}

export type AppActions =
  | AuthActions
  | ClientActions
  | ConversationActions
  | InvitationActions
  | LanguageActions
  | LocalStorageActions
  | SelfActions
  | UserActions;

export * from './AuthActionCreator';
export * from './ClientActionCreator';
export * from './ConversationActionCreator';
export * from './InvitationActionCreator';
export * from './LanguageActionCreator';
export * from './LocalStorageActionCreator';
export * from './SelfActionCreator';
export * from './UserActionCreator';
