/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

/*
 * This file gets compiled and injected separately into the auth and root
 * index.html, to not include any advanced (possibly not supported by
 * browser) JS.
 * Since we are using `sourceMap` for both development and production, `webpack`
 * wraps this compiled JS onto its code, which can already break in the oldest
 * browsers.
 * For this reason, we have all primitive feature detections in a separate static JS
 * file, `src/page/browser.js`, that doesn't get compiled by webpack.
 * We need to keep this file as TS in the codebase and not merge with the static JS,
 * to have the possibility to use config values and constants
 *
 */

import Cookies from 'js-cookie';

import {QUERY_KEY} from '../auth/route';

const isOauth = (): boolean => location?.hash?.includes(QUERY_KEY.SCOPE) ?? false;

const cookieName = 'cookie_supported_test_wire_cookie_name';

const isMobileBrowser = (): boolean => {
  const isTouchScreen = window.matchMedia('(any-pointer:coarse)').matches;
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
  return (
    isTouchScreen &&
    isSmallScreen &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

const supportsCookies = (): boolean => {
  switch (navigator.cookieEnabled) {
    case true:
      return true;
    case false:
      return false;
    default:
      Cookies.set(cookieName, 'yes');
      if (Cookies.get(cookieName)) {
        Cookies.remove(cookieName);
        return true;
      }
      return false;
  }
};

const redirectUnsupportedBrowser = (error: string): void => {
  location.href = '/unsupported/';
  console.error('[CheckBrowser]', error);
};

const supportsIndexDB = (): Promise<boolean> =>
  new Promise<boolean>((resolve, _reject) => {
    if (!('indexedDB' in window)) {
      return resolve(false);
    }

    if (navigator.userAgent.toLowerCase().indexOf('firefox') === -1) {
      return resolve(true);
    }

    // some versions of FF don't allow access to IndexDB in the private mode
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
    };

    dbOpenRequest.onsuccess = _event => {
      clearTimeout(connectionTimeout);
      return resolve(true);
    };
  });

const checkBrowser = (): void => {
  if (!supportsCookies()) {
    redirectUnsupportedBrowser("This browser doesn't support cookies to run the Wire app!");
    return;
  }
  // Skip the mobile browser check for OAuth
  if (isOauth()) {
    return;
  }

  if (isMobileBrowser() && !window.location.pathname.includes('/auth/')) {
    redirectUnsupportedBrowser("This browser doesn't support the Wire app on mobile devices!");
    return;
  }

  if (!('RTCPeerConnection' in window)) {
    redirectUnsupportedBrowser("This browser doesn't support RTC to run the Wire app!");
    return;
  }
  void supportsIndexDB()
    .catch(() => false)
    .then(res => {
      if (!res) {
        redirectUnsupportedBrowser("This browser doesn't support IndexDB to run the Wire app!");
      }
    });
};

checkBrowser();
