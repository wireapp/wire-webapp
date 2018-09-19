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

import * as CookieActionCreator from './creator/CookieActionCreator';
import * as CookieSelector from '../selector/CookieSelector';

const COOKIE_POLL_INTERVAL = 1000;

export function startPolling(
  name = CookieSelector.COOKIE_NAME_APP_OPENED,
  interval = COOKIE_POLL_INTERVAL,
  asJSON = true
) {
  return function(dispatch, getState, {}) {
    return Promise.resolve()
      .then(() => dispatch(getCookie(name, asJSON)))
      .then(() => setInterval(() => dispatch(getCookie(name, asJSON)), interval))
      .then(timerId => dispatch(CookieActionCreator.startCookiePolling({name, timerId})))
      .catch(error => dispatch(CookieActionCreator.failedCookiePolling(error)));
  };
}

export function stopPolling(name) {
  return function(dispatch, getState, {}) {
    return Promise.resolve()
      .then(() => {
        const timerId = getState().cookieState.cookieTimer[name];
        if (timerId) {
          clearTimeout(timerId);
          dispatch(CookieActionCreator.stopCookiePolling({name, timerId}));
        }
      })
      .catch(error => dispatch(CookieActionCreator.failedCookiePolling(error)));
  };
}

export function getCookie(name, asJSON = false) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve(asJSON ? cookieStore.getJSON(name) : cookieStore.get(name))
      .then(cookie => {
        const previousCookie = CookieSelector.getCookies(getState())[name];
        const isCookieModified = JSON.stringify(previousCookie) !== JSON.stringify(cookie);
        if (isCookieModified) {
          dispatch(CookieActionCreator.successfulGetCookie({cookie, name}));
        }
      })
      .catch(error => dispatch(CookieActionCreator.failedGetCookie(error)));
  };
}

export function safelyRemoveCookie(name, value) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve()
      .then(() => {
        if (cookieStore.get(name).includes(value)) {
          cookieStore.remove(name);
          dispatch(CookieActionCreator.successfulRemoveCookie({name}));
        }
      })
      .catch(error => dispatch(CookieActionCreator.failedRemoveCookie(error)));
  };
}

export function removeCookie(name) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve()
      .then(() => {
        cookieStore.remove(name);
        dispatch(CookieActionCreator.successfulRemoveCookie({name}));
      })
      .catch(error => dispatch(CookieActionCreator.failedRemoveCookie(error)));
  };
}

export function setCookie(name, value) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve(cookieStore.set(name, value))
      .then(() => dispatch(CookieActionCreator.successfulSetCookie({name})))
      .catch(error => dispatch(CookieActionCreator.failedSetCookie(error)));
  };
}

export function setCookieIfAbsent(name, value) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve()
      .then(() => {
        if (!cookieStore.get(name)) {
          cookieStore.set(name, value);
          const cookie = cookieStore.get(name);
          dispatch(CookieActionCreator.successfulSetCookie({cookie, name}));
        }
      })
      .catch(error => dispatch(CookieActionCreator.failedSetCookie(error)));
  };
}
