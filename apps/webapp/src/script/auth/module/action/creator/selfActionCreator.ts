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

import type {Consent, Self} from '@wireapp/api-client/lib/self/';

import type {AppAction} from '.';

export enum SELF_ACTION {
  CONSENT_GET_FAILED = 'CONSENT_GET_FAILED',
  CONSENT_GET_START = 'CONSENT_GET_START',
  CONSENT_GET_SUCCESS = 'CONSENT_GET_SUCCESS',

  CONSENT_SET_FAILED = 'CONSENT_SET_FAILED',
  CONSENT_SET_START = 'CONSENT_SET_START',
  CONSENT_SET_SUCCESS = 'CONSENT_SET_SUCCESS',

  HANDLE_SET_FAILED = 'HANDLE_SET_FAILED',
  HANDLE_SET_START = 'HANDLE_SET_START',
  HANDLE_SET_SUCCESS = 'HANDLE_SET_SUCCESS',

  SELF_FETCH_FAILED = 'SELF_FETCH_FAILED',
  SELF_FETCH_START = 'SELF_FETCH_START',
  SELF_FETCH_SUCCESS = 'SELF_FETCH_SUCCESS',

  SELF_SET_EMAIL_FAILED = 'SELF_SET_EMAIL_FAILED',
  SELF_SET_EMAIL_START = 'SELF_SET_EMAIL_START',
  SELF_SET_EMAIL_SUCCESS = 'SELF_SET_EMAIL_SUCCESS',

  SELF_SET_PASSWORD_FAILED = 'SELF_SET_PASSWORD_FAILED',
  SELF_SET_PASSWORD_START = 'SELF_SET_PASSWORD_START',
  SELF_SET_PASSWORD_STATE_FAILED = 'SELF_SET_PASSWORD_STATE_FAILED',

  SELF_SET_PASSWORD_STATE_START = 'SELF_SET_PASSWORD_STATE_START',
  SELF_SET_PASSWORD_STATE_SUCCESS = 'SELF_SET_PASSWORD_STATE_SUCCESS',
  SELF_SET_PASSWORD_SUCCESS = 'SELF_SET_PASSWORD_SUCCESS',
}

export type SelfActions =
  | FetchSelfStartAction
  | FetchSelfSuccessAction
  | FetchSelfFailedAction
  | SetHandleStartAction
  | SetHandleSuccessAction
  | SetHandleFailedAction
  | SetPasswordStateStartAction
  | SetPasswordStateSuccessAction
  | SetPasswordStateFailedAction
  | GetConsentsStartAction
  | GetConsentsSuccessAction
  | GetConsentsFailedAction
  | SetConsentStartAction
  | SetConsentSuccessAction
  | SetConsentFailedAction
  | SetSelfEmailStartAction
  | SetSelfEmailSuccessAction
  | SetSelfEmailFailedAction
  | SetSelfPasswordStartAction
  | SetSelfPasswordSuccessAction
  | SetSelfPasswordFailedAction;

export interface SetHandleStartAction extends AppAction {
  readonly type: SELF_ACTION.HANDLE_SET_START;
}
export interface SetHandleSuccessAction extends AppAction {
  readonly payload: Self;
  readonly type: SELF_ACTION.HANDLE_SET_SUCCESS;
}
export interface SetHandleFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.HANDLE_SET_FAILED;
}

export interface SetPasswordStateStartAction extends AppAction {
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_STATE_START;
}
export interface SetPasswordStateSuccessAction extends AppAction {
  readonly payload: boolean;
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_STATE_SUCCESS;
}
export interface SetPasswordStateFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_STATE_FAILED;
}

export interface FetchSelfStartAction extends AppAction {
  readonly type: SELF_ACTION.SELF_FETCH_START;
}
export interface FetchSelfSuccessAction extends AppAction {
  readonly payload: Self;
  readonly type: SELF_ACTION.SELF_FETCH_SUCCESS;
}
export interface FetchSelfFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.SELF_FETCH_FAILED;
}

export interface GetConsentsStartAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_GET_START;
}
export interface GetConsentsSuccessAction extends AppAction {
  readonly payload: Consent[];
  readonly type: SELF_ACTION.CONSENT_GET_SUCCESS;
}
export interface GetConsentsFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.CONSENT_GET_FAILED;
}

export interface SetConsentStartAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_SET_START;
}
export interface SetConsentSuccessAction extends AppAction {
  readonly payload: Consent;
  readonly type: SELF_ACTION.CONSENT_SET_SUCCESS;
}
export interface SetConsentFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.CONSENT_SET_FAILED;
}

export interface SetSelfEmailStartAction extends AppAction {
  readonly type: SELF_ACTION.SELF_SET_EMAIL_START;
}
export interface SetSelfEmailSuccessAction extends AppAction {
  payload: string;
  readonly type: SELF_ACTION.SELF_SET_EMAIL_SUCCESS;
}
export interface SetSelfEmailFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.SELF_SET_EMAIL_FAILED;
}

export interface SetSelfPasswordStartAction extends AppAction {
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_START;
}
export interface SetSelfPasswordSuccessAction extends AppAction {
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_SUCCESS;
}
export interface SetSelfPasswordFailedAction extends AppAction {
  readonly error: Error;
  readonly type: SELF_ACTION.SELF_SET_PASSWORD_FAILED;
}

export class SelfActionCreator {
  static startSetHandle = (): SetHandleStartAction => {
    return {
      type: SELF_ACTION.HANDLE_SET_START,
    };
  };
  static successfulSetHandle = (selfUser: Self): SetHandleSuccessAction => {
    return {
      payload: selfUser,
      type: SELF_ACTION.HANDLE_SET_SUCCESS,
    };
  };
  static failedSetHandle = (error: Error): SetHandleFailedAction => {
    return {
      error,
      type: SELF_ACTION.HANDLE_SET_FAILED,
    };
  };

  static startSetPasswordState = (): SetPasswordStateStartAction => {
    return {
      type: SELF_ACTION.SELF_SET_PASSWORD_STATE_START,
    };
  };
  static successfulSetPasswordState = ({hasPassword}: {hasPassword: boolean}): SetPasswordStateSuccessAction => {
    return {
      payload: hasPassword,
      type: SELF_ACTION.SELF_SET_PASSWORD_STATE_SUCCESS,
    };
  };
  static failedSetPasswordState = (error: Error): SetPasswordStateFailedAction => {
    return {
      error,
      type: SELF_ACTION.SELF_SET_PASSWORD_STATE_FAILED,
    };
  };

  static startFetchSelf = (): FetchSelfStartAction => {
    return {
      type: SELF_ACTION.SELF_FETCH_START,
    };
  };
  static successfulFetchSelf = (selfUser: Self): FetchSelfSuccessAction => {
    return {
      payload: selfUser,
      type: SELF_ACTION.SELF_FETCH_SUCCESS,
    };
  };
  static failedFetchSelf = (error: Error): FetchSelfFailedAction => {
    return {
      error,
      type: SELF_ACTION.SELF_FETCH_FAILED,
    };
  };

  static startGetConsents = (): GetConsentsStartAction => {
    return {
      type: SELF_ACTION.CONSENT_GET_START,
    };
  };
  static successfulGetConsents = (consents: Consent[]): GetConsentsSuccessAction => {
    return {
      payload: consents,
      type: SELF_ACTION.CONSENT_GET_SUCCESS,
    };
  };
  static failedGetConsents = (error: Error): GetConsentsFailedAction => {
    return {
      error,
      type: SELF_ACTION.CONSENT_GET_FAILED,
    };
  };

  static startSetConsent = (): SetConsentStartAction => {
    return {
      type: SELF_ACTION.CONSENT_SET_START,
    };
  };
  static successfulSetConsent = (consent: Consent): SetConsentSuccessAction => {
    return {
      payload: consent,
      type: SELF_ACTION.CONSENT_SET_SUCCESS,
    };
  };
  static failedSetConsent = (error: Error): SetConsentFailedAction => {
    return {
      error,
      type: SELF_ACTION.CONSENT_SET_FAILED,
    };
  };

  static startSetSelfEmail = (): SetSelfEmailStartAction => {
    return {
      type: SELF_ACTION.SELF_SET_EMAIL_START,
    };
  };
  static successfulSetSelfEmail = (email: string): SetSelfEmailSuccessAction => {
    return {
      payload: email,
      type: SELF_ACTION.SELF_SET_EMAIL_SUCCESS,
    };
  };
  static failedSetSelfEmail = (error: Error): SetSelfEmailFailedAction => {
    return {
      error,
      type: SELF_ACTION.SELF_SET_EMAIL_FAILED,
    };
  };

  static startSetSelfPassword = (): SetSelfPasswordStartAction => {
    return {
      type: SELF_ACTION.SELF_SET_PASSWORD_START,
    };
  };
  static successfulSetSelfPassword = (): SetSelfPasswordSuccessAction => {
    return {
      type: SELF_ACTION.SELF_SET_PASSWORD_SUCCESS,
    };
  };
  static failedSetSelfPassword = (error: Error): SetSelfPasswordFailedAction => {
    return {
      error,
      type: SELF_ACTION.SELF_SET_PASSWORD_FAILED,
    };
  };
}
