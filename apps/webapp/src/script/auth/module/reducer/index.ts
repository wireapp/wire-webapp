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

import {AnyAction, bindActionCreators as bindActionCreatorsRedux} from 'redux';
import type {ThunkAction as ReduxThunkAction, ThunkDispatch as ReduxThunkDispatch} from 'redux-thunk';

import type {APIClient} from '@wireapp/api-client';
import type {Account} from '@wireapp/core';

import {AuthState, authReducer, initialAuthState} from './authReducer';
import {ClientState, clientReducer, initialClientState} from './clientReducer';
import {ConversationState, conversationReducer, initialConversationState} from './conversationReducer';
import {InvitationState, initialInvitationState, invitationReducer} from './inviteReducer';
import {LanguageState, initialLanguageState, languageReducer} from './languageReducer';
import {SelfState, initialSelfState, selfReducer} from './selfReducer';

import type {Configuration} from '../../../Config';
import type {ActionRoot} from '../action';

export type Api = {
  actions: ActionRoot;
  apiClient: APIClient;
  core: Account;
  getConfig: () => Configuration;
  localStorage: Storage;
};

export interface RootState {
  authState: AuthState;
  clientState: ClientState;
  conversationState: ConversationState;
  inviteState: InvitationState;
  languageState: LanguageState;
  selfState: SelfState;
}

export const initialRootState: RootState = {
  authState: initialAuthState,
  clientState: initialClientState,
  conversationState: initialConversationState,
  inviteState: initialInvitationState,
  languageState: initialLanguageState,
  selfState: initialSelfState,
};

export type ThunkAction<T = Promise<void>> = ReduxThunkAction<T, RootState, Api, AnyAction>;
export type ThunkDispatch = ReduxThunkDispatch<RootState, Api, AnyAction>;

export type BindActionCreators = typeof bindActionCreatorsRedux;
export const bindActionCreators: BindActionCreators = bindActionCreatorsRedux;

export const reducers = {
  authState: authReducer,
  clientState: clientReducer,
  conversationState: conversationReducer,
  inviteState: invitationReducer,
  languageState: languageReducer,
  selfState: selfReducer,
};
