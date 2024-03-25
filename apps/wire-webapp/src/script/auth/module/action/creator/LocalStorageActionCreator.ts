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

import type {AppAction} from '.';

export enum LOCAL_STORAGE_ACTION {
  LOCAL_STORAGE_DELETE_FAILED = 'LOCAL_STORAGE_DELETE_FAILED',
  LOCAL_STORAGE_DELETE_START = 'LOCAL_STORAGE_DELETE_START',
  LOCAL_STORAGE_DELETE_SUCCESS = 'LOCAL_STORAGE_DELETE_SUCCESS',

  LOCAL_STORAGE_GET_FAILED = 'LOCAL_STORAGE_GET_FAILED',
  LOCAL_STORAGE_GET_START = 'LOCAL_STORAGE_GET_START',
  LOCAL_STORAGE_GET_SUCCESS = 'LOCAL_STORAGE_GET_SUCCESS',

  LOCAL_STORAGE_SET_FAILED = 'LOCAL_STORAGE_SET_FAILED',
  LOCAL_STORAGE_SET_START = 'LOCAL_STORAGE_SET_START',
  LOCAL_STORAGE_SET_SUCCESS = 'LOCAL_STORAGE_SET_SUCCESS',
}

export type LocalStorageActions =
  | SetStartAction
  | SetSuccessAction
  | SetFailedAction
  | GetStartAction
  | GetSuccessAction
  | GetFailedAction
  | DeleteStartAction
  | DeleteSuccessAction
  | DeleteFailedAction;

export interface SetStartAction extends AppAction {
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_START;
}
export interface SetSuccessAction extends AppAction {
  readonly payload: {key: string; value: string | boolean | number};
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_SUCCESS;
}
export interface SetFailedAction extends AppAction {
  readonly error: Error;
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_FAILED;
}

export interface GetStartAction extends AppAction {
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_START;
}
export interface GetSuccessAction extends AppAction {
  readonly payload: {key: string; value: string | boolean | number};
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_SUCCESS;
}
export interface GetFailedAction extends AppAction {
  readonly error: Error;
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_FAILED;
}

export interface DeleteStartAction extends AppAction {
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_START;
}
export interface DeleteSuccessAction extends AppAction {
  readonly payload: {key: string};
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_SUCCESS;
}
export interface DeleteFailedAction extends AppAction {
  readonly error: Error;
  readonly type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_FAILED;
}

export class LocalStorageActionCreator {
  static startLocalStorageSet = (): SetStartAction => ({
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_START,
  });
  static successfulLocalStorageSet = (key: string, value: string | boolean | number): SetSuccessAction => ({
    payload: {key, value},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_SUCCESS,
  });
  static failedLocalStorageSet = (error: Error): SetFailedAction => ({
    error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_FAILED,
  });

  static startLocalStorageGet = (): GetStartAction => ({
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_START,
  });
  static successfulLocalStorageGet = (key: string, value: string | boolean | number): GetSuccessAction => ({
    payload: {key, value},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_SUCCESS,
  });
  static failedLocalStorageGet = (error: Error): GetFailedAction => ({
    error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_FAILED,
  });

  static startLocalStorageDelete = (): DeleteStartAction => ({
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_START,
  });
  static successfulLocalStorageDelete = (key: string): DeleteSuccessAction => ({
    payload: {key},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_SUCCESS,
  });
  static failedLocalStorageDelete = (error: Error): DeleteFailedAction => ({
    error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_FAILED,
  });
}
