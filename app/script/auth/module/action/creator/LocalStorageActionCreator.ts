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

export enum LOCAL_STORAGE_ACTION {
  LOCAL_STORAGE_SET_START = 'LOCAL_STORAGE_SET_START',
  LOCAL_STORAGE_SET_SUCCESS = 'LOCAL_STORAGE_SET_SUCCESS',
  LOCAL_STORAGE_SET_FAILED = 'LOCAL_STORAGE_SET_FAILED',

  LOCAL_STORAGE_GET_START = 'LOCAL_STORAGE_GET_START',
  LOCAL_STORAGE_GET_SUCCESS = 'LOCAL_STORAGE_GET_SUCCESS',
  LOCAL_STORAGE_GET_FAILED = 'LOCAL_STORAGE_GET_FAILED',

  LOCAL_STORAGE_DELETE_START = 'LOCAL_STORAGE_DELETE_START',
  LOCAL_STORAGE_DELETE_SUCCESS = 'LOCAL_STORAGE_DELETE_SUCCESS',
  LOCAL_STORAGE_DELETE_FAILED = 'LOCAL_STORAGE_DELETE_FAILED',
}

export type LocalStorageActions = any;

export class LocalStorageActionCreator {
  static startLocalStorageSet = (params?: any) => ({
    params,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_START,
  });

  static successfulLocalStorageSet = (key, value) => ({
    payload: {key, value},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_SUCCESS,
  });

  static failedLocalStorageSet = (error?: any) => ({
    payload: error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_SET_FAILED,
  });

  static startLocalStorageGet = (params?: any) => ({
    params,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_START,
  });

  static successfulLocalStorageGet = (key: string, value: string) => ({
    payload: {key, value},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_SUCCESS,
  });

  static failedLocalStorageGet = (error?: any) => ({
    payload: error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_GET_FAILED,
  });

  static startLocalStorageDelete = (params?: any) => ({
    params,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_START,
  });

  static successfulLocalStorageDelete = (key: string) => ({
    payload: {key},
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_SUCCESS,
  });

  static failedLocalStorageDelete = (error?: any) => ({
    payload: error,
    type: LOCAL_STORAGE_ACTION.LOCAL_STORAGE_DELETE_FAILED,
  });
}
