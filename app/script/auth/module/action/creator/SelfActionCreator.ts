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

import {Self} from '@wireapp/api-client/dist/commonjs/self';

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
  | typeof SelfActionCreator.startSetHandle
  | typeof SelfActionCreator.successfulSetHandle
  | typeof SelfActionCreator.failedSetHandle
  | typeof SelfActionCreator.startFetchSelf
  | typeof SelfActionCreator.successfulFetchSelf
  | typeof SelfActionCreator.failedFetchSelf
  | typeof SelfActionCreator.startGetConsents
  | typeof SelfActionCreator.successfulGetConsents
  | typeof SelfActionCreator.failedGetConsents
  | typeof SelfActionCreator.startSetConsent
  | typeof SelfActionCreator.successfulSetConsent
  | typeof SelfActionCreator.failedSetConsent
  ;

export class SelfActionCreator {
  static startSetHandle = (params?: any) => ({
    params,
    type: SELF_ACTION.HANDLE_SET_START,
  });

  static successfulSetHandle = (selfUser: Self) => ({
    payload: selfUser,
    type: SELF_ACTION.HANDLE_SET_SUCCESS,
  });

  static failedSetHandle = (error?: any) => ({
    payload: error,
    type: SELF_ACTION.HANDLE_SET_FAILED,
  });

  static startFetchSelf = (params?: any) => ({
    params,
    type: SELF_ACTION.SELF_FETCH_START,
  });

  static successfulFetchSelf = (selfUser: Self) => ({
    payload: selfUser,
    type: SELF_ACTION.SELF_FETCH_SUCCESS,
  });

  static failedFetchSelf = (error?: any) => ({
    payload: error,
    type: SELF_ACTION.SELF_FETCH_FAILED,
  });

  static startGetConsents = (params?: any) => ({
    params,
    type: SELF_ACTION.CONSENT_GET_START,
  });

  static successfulGetConsents = consents => ({
    payload: consents,
    type: SELF_ACTION.CONSENT_GET_SUCCESS,
  });

  static failedGetConsents = (error?: any) => ({
    payload: error,
    type: SELF_ACTION.CONSENT_GET_FAILED,
  });

  static startSetConsent = (params?: any) => ({
    params,
    type: SELF_ACTION.CONSENT_SET_START,
  });

  static successfulSetConsent = consent => ({
    payload: consent,
    type: SELF_ACTION.CONSENT_SET_SUCCESS,
  });

  static failedSetConsent = (error?: any) => ({
    payload: error,
    type: SELF_ACTION.CONSENT_SET_FAILED,
  });
}
