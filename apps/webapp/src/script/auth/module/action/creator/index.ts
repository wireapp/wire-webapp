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

import type {AuthActions} from './authactioncreator';
import type {ClientActions} from './clientactioncreator';
import type {ConversationActions} from './conversationactioncreator';
import type {InvitationActions} from './invitationactioncreator';
import type {LanguageActions} from './languageactioncreator';
import type {LocalStorageActions} from './localstorageactioncreator';
import type {SelfActions} from './selfactioncreator';
import type {UserActions} from './useractioncreator';

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

export * from './authactioncreator';
export * from './clientactioncreator';
export * from './conversationactioncreator';
export * from './invitationactioncreator';
export * from './languageactioncreator';
export * from './localstorageactioncreator';
export * from './selfactioncreator';
export * from './useractioncreator';
