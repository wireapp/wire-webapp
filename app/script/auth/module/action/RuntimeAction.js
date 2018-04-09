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

import * as RuntimeActionCreator from './creator/RuntimeActionCreator';
import Runtime from '../../Runtime';

const runtime = new Runtime();

export function checkSupportedBrowser() {
  return function(dispatch) {
    if (runtime.isSupportedBrowser()) {
      dispatch(RuntimeActionCreator.confirmSupportedBrowser());
    }
  };
}

export function checkIndexedDbSupport() {
  return function(dispatch) {
    dispatch(RuntimeActionCreator.startCheckIndexedDb());
    hasIndexedDbSupport()
      .then(() => dispatch(RuntimeActionCreator.finishCheckIndexedDb(true)))
      .catch(() => dispatch(RuntimeActionCreator.finishCheckIndexedDb(false)));
  };
}

export function checkCookieSupport() {
  return function(dispatch) {
    dispatch(RuntimeActionCreator.startCheckCookie());
    hasCookieSupport()
      .then(() => dispatch(RuntimeActionCreator.finishCheckCookie(true)))
      .catch(() => dispatch(RuntimeActionCreator.finishCheckCookie(false)));
  };
}

function hasCookieSupport() {
  const cookieName = 'cookie_supported';

  return new Promise((resolve, reject) => {
    switch (navigator.cookieEnabled) {
      case true:
        return resolve();
      case false:
        return reject(new Error());
      default:
        Cookies.set(cookieName, 'yes');
        if (Cookies.get(cookieName)) {
          Cookies.remove(cookieName);
          return resolve();
        }
        return reject(new Error());
    }
  });
}

function hasIndexedDbSupport() {
  if (!window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (runtime.isFirefox()) {
    let dbOpenRequest;

    try {
      dbOpenRequest = window.indexedDB.open('test');
      dbOpenRequest.onerror = event => {
        if (dbOpenRequest.error) {
          event.preventDefault();
          Promise.reject(new Error('Error opening IndexedDB'));
        }
      };
    } catch (error) {
      return Promise.reject(new Error('Error initializing IndexedDB'));
    }

    return new Promise((resolve, reject) => {
      const interval = 10;
      const maxRetry = 50;

      function checkDbRequest(currentAttempt = 0) {
        const tooManyAttempts = currentAttempt >= maxRetry;
        const isRequestDone = dbOpenRequest.readyState === 'done';

        if (isRequestDone) {
          const hasResult = !!dbOpenRequest.result;
          return hasResult ? resolve() : reject(new Error('Failed to open IndexedDb'));
        }

        if (tooManyAttempts) {
          return reject(new Error('IndexedDb open request timed out'));
        }

        window.setTimeout(() => checkDbRequest(currentAttempt + 1), interval);
      }

      checkDbRequest();
    });
  }

  return Promise.resolve();
}
