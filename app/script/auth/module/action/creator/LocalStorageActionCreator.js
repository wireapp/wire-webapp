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

export const LOCAL_STORAGE_SET_START = 'LOCAL_STORAGE_SET_START';
export const LOCAL_STORAGE_SET_SUCCESS = 'LOCAL_STORAGE_SET_SUCCESS';
export const LOCAL_STORAGE_SET_FAILED = 'LOCAL_STORAGE_SET_FAILED';

export const LOCAL_STORAGE_GET_START = 'LOCAL_STORAGE_GET_START';
export const LOCAL_STORAGE_GET_SUCCESS = 'LOCAL_STORAGE_GET_SUCCESS';
export const LOCAL_STORAGE_GET_FAILED = 'LOCAL_STORAGE_GET_FAILED';

export const LOCAL_STORAGE_DELETE_START = 'LOCAL_STORAGE_DELETE_START';
export const LOCAL_STORAGE_DELETE_SUCCESS = 'LOCAL_STORAGE_DELETE_SUCCESS';
export const LOCAL_STORAGE_DELETE_FAILED = 'LOCAL_STORAGE_DELETE_FAILED';

export const startLocalStorageSet = params => ({
  params,
  type: LOCAL_STORAGE_SET_START,
});

export const successfulLocalStorageSet = (key, value) => ({
  payload: {key, value},
  type: LOCAL_STORAGE_SET_SUCCESS,
});

export const failedLocalStorageSet = error => ({
  payload: error,
  type: LOCAL_STORAGE_SET_FAILED,
});

export const startLocalStorageGet = params => ({
  params,
  type: LOCAL_STORAGE_GET_START,
});

export const successfulLocalStorageGet = (key, value) => ({
  payload: {key, value},
  type: LOCAL_STORAGE_GET_SUCCESS,
});

export const failedLocalStorageGet = error => ({
  payload: error,
  type: LOCAL_STORAGE_GET_FAILED,
});

export const startLocalStorageDelete = params => ({
  params,
  type: LOCAL_STORAGE_DELETE_START,
});

export const successfulLocalStorageDelete = (key, value) => ({
  payload: {key, value},
  type: LOCAL_STORAGE_DELETE_SUCCESS,
});

export const failedLocalStorageDelete = error => ({
  payload: error,
  type: LOCAL_STORAGE_DELETE_FAILED,
});
