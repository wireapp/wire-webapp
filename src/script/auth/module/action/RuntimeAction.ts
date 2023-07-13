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

import Cookies from 'js-cookie';

import {Runtime} from '@wireapp/commons';

import {RuntimeActionCreator} from './creator/';

import * as RuntimeSelector from '../../module/selector/RuntimeSelector';
import {QUERY_KEY} from '../../route';
import type {ThunkAction} from '../reducer';

export class RuntimeAction {
  checkSupportedBrowser = (): ThunkAction<void> => {
    return (dispatch, getState, {getConfig}) => {
      const isMobileSupportedBrowser = () => {
        return Runtime.isMobileOS() && (Runtime.isSafari() || Runtime.isChrome());
      };
      const isAuthorizationFlow = () => location?.search?.includes(QUERY_KEY.SCOPE) ?? false;
      if (
        (!RuntimeSelector.hasToUseDesktopApplication(getState()) && Runtime.isWebappSupportedBrowser()) ||
        (isMobileSupportedBrowser() && isAuthorizationFlow())
      ) {
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
    return async (dispatch, getState, {actions: {runtimeAction}}) => {
      dispatch(RuntimeActionCreator.startCheckCookie());
      try {
        await runtimeAction.hasCookieSupport();
        dispatch(RuntimeActionCreator.finishCheckCookie(true));
      } catch (error) {
        dispatch(RuntimeActionCreator.finishCheckCookie(false));
      }
    };
  };

  hasCookieSupport = (): Promise<void> => {
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
