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

import {Consent, Self} from '@wireapp/api-client/dist/commonjs/self';
import {AppAction} from '.';

export enum SELF_ACTION {
  CONSENT_GET_START = 'CONSENT_GET_START',
  CONSENT_GET_SUCCESS = 'CONSENT_GET_SUCCESS',
  CONSENT_GET_FAILED = 'CONSENT_GET_FAILED',

  CONSENT_SET_START = 'CONSENT_SET_START',
  CONSENT_SET_SUCCESS = 'CONSENT_SET_SUCCESS',
  CONSENT_SET_FAILED = 'CONSENT_SET_FAILED',

  HANDLE_SET_START = 'HANDLE_SET_START',
  HANDLE_SET_SUCCESS = 'HANDLE_SET_SUCCESS',
  HANDLE_SET_FAILED = 'HANDLE_SET_FAILED',

  SELF_FETCH_START = 'SELF_FETCH_START',
  SELF_FETCH_SUCCESS = 'SELF_FETCH_SUCCESS',
  SELF_FETCH_FAILED = 'SELF_FETCH_FAILED',
}

export type SelfActions =
  | FetchSelfStartAction
  | FetchSelfSuccessAction
  | FetchSelfFailedAction
  | SetHandleStartAction
  | SetHandleSuccessAction
  | SetHandleFailedAction
  | GetConsentsStartAction
  | GetConsentsSuccessAction
  | GetConsentsFailedAction
  | SetConsentStartAction
  | SetConsentSuccessAction
  | SetConsentFailedAction;

export interface SetHandleStartAction extends AppAction {
  readonly type: SELF_ACTION.HANDLE_SET_START;
}
export interface SetHandleSuccessAction extends AppAction {
  readonly payload: Self;
  readonly type: SELF_ACTION.HANDLE_SET_SUCCESS;
}
export interface SetHandleFailedAction extends AppAction {
  readonly type: SELF_ACTION.HANDLE_SET_FAILED;
  readonly error: Error;
}

export interface FetchSelfStartAction extends AppAction {
  readonly type: SELF_ACTION.SELF_FETCH_START;
}
export interface FetchSelfSuccessAction extends AppAction {
  readonly payload: Self;
  readonly type: SELF_ACTION.SELF_FETCH_SUCCESS;
}
export interface FetchSelfFailedAction extends AppAction {
  readonly type: SELF_ACTION.SELF_FETCH_FAILED;
  readonly error: Error;
}

export interface GetConsentsStartAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_GET_START;
}
export interface GetConsentsSuccessAction extends AppAction {
  readonly payload: Consent[];
  readonly type: SELF_ACTION.CONSENT_GET_SUCCESS;
}
export interface GetConsentsFailedAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_GET_FAILED;
  readonly error: Error;
}

export interface SetConsentStartAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_SET_START;
}
export interface SetConsentSuccessAction extends AppAction {
  readonly payload: Consent;
  readonly type: SELF_ACTION.CONSENT_SET_SUCCESS;
}
export interface SetConsentFailedAction extends AppAction {
  readonly type: SELF_ACTION.CONSENT_SET_FAILED;
  readonly error: Error;
}

export class SelfActionCreator {
  static startSetHandle = (): SetHandleStartAction => ({
    type: SELF_ACTION.HANDLE_SET_START,
  });
  static successfulSetHandle = (selfUser: Self): SetHandleSuccessAction => ({
    payload: selfUser,
    type: SELF_ACTION.HANDLE_SET_SUCCESS,
  });
  static failedSetHandle = (error: Error): SetHandleFailedAction => ({
    error,
    type: SELF_ACTION.HANDLE_SET_FAILED,
  });

  static startFetchSelf = (): FetchSelfStartAction => ({
    type: SELF_ACTION.SELF_FETCH_START,
  });
  static successfulFetchSelf = (selfUser: Self): FetchSelfSuccessAction => ({
    payload: selfUser,
    type: SELF_ACTION.SELF_FETCH_SUCCESS,
  });
  static failedFetchSelf = (error: Error): FetchSelfFailedAction => ({
    error,
    type: SELF_ACTION.SELF_FETCH_FAILED,
  });

  static startGetConsents = (): GetConsentsStartAction => ({
    type: SELF_ACTION.CONSENT_GET_START,
  });
  static successfulGetConsents = (consents: Consent[]): GetConsentsSuccessAction => ({
    payload: consents,
    type: SELF_ACTION.CONSENT_GET_SUCCESS,
  });
  static failedGetConsents = (error: Error): GetConsentsFailedAction => ({
    error,
    type: SELF_ACTION.CONSENT_GET_FAILED,
  });

  static startSetConsent = (): SetConsentStartAction => ({
    type: SELF_ACTION.CONSENT_SET_START,
  });
  static successfulSetConsent = (consent: Consent): SetConsentSuccessAction => ({
    payload: consent,
    type: SELF_ACTION.CONSENT_SET_SUCCESS,
  });
  static failedSetConsent = (error: Error): SetConsentFailedAction => ({
    error,
    type: SELF_ACTION.CONSENT_SET_FAILED,
  });
}
