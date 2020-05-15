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

import type {ThunkAction} from '../reducer';
import {LocalStorageActionCreator} from './creator/';

export const LocalStorageKey = {
  AUTH: {
    ACCESS_TOKEN: {
      EXPIRATION: '__amplify__z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION',
      TTL: '__amplify__z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL',
      TYPE: '__amplify__z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE',
      VALUE: '__amplify__z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE',
    },
    COOKIE_LABEL: '__amplify__z.storage.StorageKey.AUTH.COOKIE_LABEL',
    PERSIST: '__amplify__z.storage.StorageKey.AUTH.PERSIST',
  },
};

export class LocalStorageAction {
  setLocalStorage = (key: string, value: any): ThunkAction => {
    return async (dispatch, getState, {localStorage}) => {
      dispatch(LocalStorageActionCreator.startLocalStorageSet());
      try {
        localStorage.setItem(key, JSON.stringify({data: value}));
        dispatch(LocalStorageActionCreator.successfulLocalStorageSet(key, value));
      } catch (error) {
        dispatch(LocalStorageActionCreator.failedLocalStorageSet(error));
        throw error;
      }
    };
  };

  getLocalStorage = (key: string): ThunkAction<Promise<string | boolean | number>> => {
    return async (dispatch, getState, {localStorage}) => {
      dispatch(LocalStorageActionCreator.startLocalStorageGet());
      let data: string | boolean | number;
      try {
        data = JSON.parse(localStorage.getItem(key)).data;
        dispatch(LocalStorageActionCreator.successfulLocalStorageGet(key, data));
        return data;
      } catch (error) {
        dispatch(LocalStorageActionCreator.failedLocalStorageGet(error));
        throw error;
      }
    };
  };

  deleteLocalStorage = (key: string): ThunkAction => {
    return async (dispatch, getState, {localStorage}) => {
      dispatch(LocalStorageActionCreator.startLocalStorageDelete());
      try {
        localStorage.removeItem(key);
        dispatch(LocalStorageActionCreator.successfulLocalStorageDelete(key));
      } catch (error) {
        dispatch(LocalStorageActionCreator.failedLocalStorageDelete(error));
        throw error;
      }
    };
  };
}

export const localStorageAction = new LocalStorageAction();
