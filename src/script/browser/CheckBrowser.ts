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

import {QUERY_KEY} from '../auth/route';

const isOauth = (): boolean => location?.hash?.includes(QUERY_KEY.SCOPE) ?? false;

const cookieName = 'cookie_supported_test_wire_cookiename';

const supportsCookies = (): Promise<boolean> =>
  new Promise<boolean>((resolve, _reject) => {
    switch (navigator.cookieEnabled) {
      case true:
        resolve(true);
        break;
      case false:
        resolve(false);
        break;
      default:
        Cookies.set(cookieName, 'yes');
        if (Cookies.get(cookieName)) {
          Cookies.remove(cookieName);
          resolve(true);
        } else {
          resolve(false);
        }
    }
  });

const supportsIndexDB = (): Promise<boolean> =>
  new Promise<boolean>((resolve, _reject) => {
    if (!('indexedDB' in window)) {
      resolve(false);
    } else {
      if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
        let dbOpenRequest: IDBOpenDBRequest;

        try {
          dbOpenRequest = window.indexedDB.open('test');
        } catch (error) {
          return resolve(false);
        }

        const connectionTimeout = setTimeout(() => resolve(false), 10000);
        dbOpenRequest.onerror = event => {
          clearTimeout(connectionTimeout);
          if (dbOpenRequest.error) {
            event.preventDefault();
            return resolve(false);
          }
          return undefined;
        };
        dbOpenRequest.onsuccess = event => {
          clearTimeout(connectionTimeout);
          resolve(true);
        };
      }
      resolve(true);
    }
  }).catch(() => false);

const checkBrowser = (): void => {
  if (isOauth()) {
    return;
  }
  if (!('RTCPeerConnection' in window)) {
    location.href = '/unsupported/';
  }
  supportsIndexDB()
    .then(resDB => {
      if (resDB) {
        return supportsCookies();
      }
      return resDB;
    })
    .catch(() => false)
    .then(res => {
      if (!res) {
        location.href = '/unsupported/';
      }
    });
};

checkBrowser();
