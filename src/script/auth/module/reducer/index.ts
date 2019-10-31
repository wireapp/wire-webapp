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

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';
import {CookiesStatic} from 'js-cookie';
import {ActionCreatorsMapObject, AnyAction, Dispatch, bindActionCreators as bindActionCreatorsRedux} from 'redux';
import {ThunkAction as ReduxThunkAction, ThunkDispatch as ReduxThunkDispatch} from 'redux-thunk';
import {Config} from '../../config';
import {ActionRoot} from '../action';
import {AuthState, authReducer, initialState as initialAuthState} from './authReducer';
import {ClientState, clientReducer, initialState as initialClientState} from './clientReducer';
import {ConversationState, conversationReducer, initialState as initialConversationState} from './conversationReducer';
import {CookieState, cookieReducer, initialState as initialCookieState} from './cookieReducer';
import {InvitationState, initialState as initialInvitationState, invitationReducer} from './inviteReducer';
import {LanguageState, initialState as initialLanguageState, languageReducer} from './languageReducer';
import {RuntimeState, initialState as initialRuntimeState, runtimeReducer} from './runtimeReducer';
import {SelfState, initialState as initialSelfState, selfReducer} from './selfReducer';

export type Api = {
  actions: ActionRoot;
  apiClient: APIClient;
  config: typeof Config;
  cookieStore: CookiesStatic;
  core: Account;
  localStorage: Storage;
};

export interface RootState {
  authState: AuthState;
  clientState: ClientState;
  conversationState: ConversationState;
  cookieState: CookieState;
  inviteState: InvitationState;
  languageState: LanguageState;
  runtimeState: RuntimeState;
  selfState: SelfState;
}

export const initialRootState: RootState = {
  authState: initialAuthState,
  clientState: initialClientState,
  conversationState: initialConversationState,
  cookieState: initialCookieState,
  inviteState: initialInvitationState,
  languageState: initialLanguageState,
  runtimeState: initialRuntimeState,
  selfState: initialSelfState,
};

export type ThunkAction<T = Promise<void>> = ReduxThunkAction<T, RootState, Api, AnyAction>;
export type ThunkDispatch = ReduxThunkDispatch<RootState, Api, AnyAction>;

export type BindActionCreators = <M extends ActionCreatorsMapObject<any>>(
  actionCreators: M,
  dispatch: Dispatch,
) => {
  [N in keyof M]: ReturnType<M[N]> extends ReduxThunkAction<any, any, any, any>
    ? (...args: Parameters<M[N]>) => ReturnType<ReturnType<M[N]>>
    : M[N];
};

export const bindActionCreators: BindActionCreators = bindActionCreatorsRedux;

export const reducers = {
  authState: authReducer,
  clientState: clientReducer,
  conversationState: conversationReducer,
  cookieState: cookieReducer,
  inviteState: invitationReducer,
  languageState: languageReducer,
  runtimeState: runtimeReducer,
  selfState: selfReducer,
};
