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

import {CookiesStatic} from 'js-cookie';
import * as Environment from '../../Environment';
import {QUERY_KEY} from '../../route';
import {isFirefox, isMobileOs, isSafari, isSupportedBrowser} from '../../Runtime';
import {hasURLParameter} from '../../util/urlUtil';
import {ThunkAction} from '../reducer';
import {RuntimeActionCreator} from './creator/';

export class RuntimeAction {
  checkSupportedBrowser = (): ThunkAction<void> => {
    return dispatch => {
      const pwaAware = hasURLParameter(QUERY_KEY.PWA_AWARE);
      const isPwaSupportedBrowser = Environment.onEnvironment({
        onProduction: false,
        onStaging: pwaAware && (isMobileOs() || isSafari()),
      });
      if (isSupportedBrowser() || isPwaSupportedBrowser) {
        dispatch(RuntimeActionCreator.confirmSupportedBrowser());
      }
    };
  };

  checkIndexedDbSupport = (): ThunkAction<void> => {
    return (dispatch, getState, {actions: {runtimeAction}}) => {
      dispatch(RuntimeActionCreator.startCheckIndexedDb());
      runtimeAction
        .hasIndexedDbSupport()
        .then(() => {
          dispatch(RuntimeActionCreator.finishCheckIndexedDb(true));
        })
        .catch(() => {
          dispatch(RuntimeActionCreator.finishCheckIndexedDb(false));
        });
    };
  };

  checkCookieSupport = (): ThunkAction<void> => {
    return (dispatch, getState, {actions: {runtimeAction}, cookieStore}) => {
      dispatch(RuntimeActionCreator.startCheckCookie());
      runtimeAction
        .hasCookieSupport(cookieStore)
        .then(() => {
          dispatch(RuntimeActionCreator.finishCheckCookie(true));
        })
        .catch(() => {
          dispatch(RuntimeActionCreator.finishCheckCookie(false));
        });
    };
  };

  hasCookieSupport = (cookieStore: CookiesStatic): Promise<void> => {
    const cookieName = 'cookie_supported';

    return new Promise((resolve, reject) => {
      switch (navigator.cookieEnabled) {
        case true:
          return resolve();
        case false:
          return reject(new Error());
        default:
          cookieStore.set(cookieName, 'yes');
          if (cookieStore.get(cookieName)) {
            cookieStore.remove(cookieName);
            return resolve();
          }
          return reject(new Error());
      }
    });
  };

  hasIndexedDbSupport = (): Promise<void> => {
    let supportIndexedDb;
    try {
      supportIndexedDb = !!window.indexedDB;
    } catch (error) {
      supportIndexedDb = false;
    }
    if (!supportIndexedDb) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }

    if (isFirefox()) {
      let dbOpenRequest: IDBOpenDBRequest;

      try {
        dbOpenRequest = window.indexedDB.open('test');
        dbOpenRequest.onerror = event => {
          if (dbOpenRequest.error) {
            event.preventDefault();
            return Promise.reject(new Error('Error opening IndexedDB'));
          }
          return undefined;
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
  };
}

export const runtimeAction = new RuntimeAction();
