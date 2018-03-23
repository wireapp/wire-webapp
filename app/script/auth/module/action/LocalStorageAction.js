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

import * as LocalStorageActionCreator from './creator/LocalStorageActionCreator';

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

export function setLocalStorage(key, value) {
  return function(dispatch, getState, {localStorage}) {
    dispatch(LocalStorageActionCreator.startLocalStorageSet());
    return Promise.resolve()
      .then(() => localStorage.setItem(key, JSON.stringify({data: value})))
      .then(() => dispatch(LocalStorageActionCreator.successfulLocalStorageSet(key, value)))
      .catch(error => {
        dispatch(LocalStorageActionCreator.failedLocalStorageSet(error));
        throw error;
      });
  };
}

export function getLocalStorage(key) {
  return function(dispatch, getState, {localStorage}) {
    dispatch(LocalStorageActionCreator.startLocalStorageGet());
    let data;
    return Promise.resolve()
      .then(() => (data = JSON.parse(localStorage.getItem(key))))
      .then(() => dispatch(LocalStorageActionCreator.successfulLocalStorageGet(key, data)))
      .then(() => data)
      .catch(error => {
        dispatch(LocalStorageActionCreator.failedLocalStorageGet(error));
        throw error;
      });
  };
}

export function deleteLocalStorage(key) {
  return function(dispatch, getState, {localStorage}) {
    dispatch(LocalStorageActionCreator.startLocalStorageDelete());
    return Promise.resolve()
      .then(() => localStorage.removeItem(key))
      .then(() => dispatch(LocalStorageActionCreator.successfulLocalStorageDelete(key)))
      .catch(error => {
        dispatch(LocalStorageActionCreator.failedLocalStorageDelete(error));
        throw error;
      });
  };
}
