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

import type {CookiesStatic} from 'js-cookie';

import {QUERY_KEY} from '../../route';
import {Runtime} from '@wireapp/commons';
import {hasURLParameter} from '../../util/urlUtil';
import type {ThunkAction} from '../reducer';
import {RuntimeActionCreator} from './creator/';

export class RuntimeAction {
  checkSupportedBrowser = (): ThunkAction<void> => {
    return (dispatch, getState, {getConfig}) => {
      const isPwaSupportedBrowser = () => {
        return Runtime.isMobileOS() || Runtime.isSafari();
      };
      const pwaAware = hasURLParameter(QUERY_KEY.PWA_AWARE);
      const isPwaEnabled = getConfig().URL.MOBILE_BASE && pwaAware && isPwaSupportedBrowser();
      if (Runtime.isWebappSupportedBrowser() || isPwaEnabled) {
        dispatch(RuntimeActionCreator.confirmSupportedBrowser());
      }
    };
  };

  checkIndexedDbSupport = (): ThunkAction<void> => {
    return async (dispatch, getState, {actions: {runtimeAction}}) => {
      dispatch(RuntimeActionCreator.startCheckIndexedDb());
      try {
        await runtimeAction.hasIndexedDbSupport();
        dispatch(RuntimeActionCreator.finishCheckIndexedDb(true));
      } catch (error) {
        dispatch(RuntimeActionCreator.finishCheckIndexedDb(false));
      }
    };
  };

  checkCookieSupport = (): ThunkAction<void> => {
    return async (dispatch, getState, {actions: {runtimeAction}, cookieStore}) => {
      dispatch(RuntimeActionCreator.startCheckCookie());
      try {
        await runtimeAction.hasCookieSupport(cookieStore);
        dispatch(RuntimeActionCreator.finishCheckCookie(true));
      } catch (error) {
        dispatch(RuntimeActionCreator.finishCheckCookie(false));
      }
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

    if (Runtime.isFirefox()) {
      let dbOpenRequest: IDBOpenDBRequest;

      try {
        dbOpenRequest = window.indexedDB.open('test');
      } catch (error) {
        return Promise.reject(new Error('Error initializing IndexedDB'));
      }

      return new Promise((resolve, reject) => {
        const connectionTimeout = setTimeout(
          () => reject(new Error('Error opening IndexedDB (response timeout)')),
          10000,
        );
        dbOpenRequest.onerror = event => {
          clearTimeout(connectionTimeout);
          if (dbOpenRequest.error) {
            event.preventDefault();
            return reject(new Error('Error opening IndexedDB'));
          }
          return undefined;
        };
        dbOpenRequest.onsuccess = event => {
          clearTimeout(connectionTimeout);
          resolve();
        };
      });
    }

    return Promise.resolve();
  };
}

export const runtimeAction = new RuntimeAction();
