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
import {COOKIE_NAME_APP_OPENED} from '../selector/CookieSelector';

const COOKIE_POLL_INTERVAL = 1000;

export function startPolling(name = COOKIE_NAME_APP_OPENED, interval = COOKIE_POLL_INTERVAL) {
  return function(dispatch, getState, {}) {
    return Promise.resolve()
      .then(() => {
        return setInterval(() => {
          dispatch(getCookie(name));
        }, interval);
      })
      .then(timerId => dispatch(CookieActionCreator.startCookiePolling({name, timerId})))
      .catch(error => dispatch(CookieActionCreator.failedCookiePolling(error)));
  };
}

export function stopChecking(name) {
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

export function getCookie(name) {
  return function(dispatch, getState, {cookieStore}) {
    return Promise.resolve(cookieStore.get(name))
      .then(cookie => dispatch(CookieActionCreator.successfulGetCookie({cookie, name})))
      .catch(error => dispatch(CookieActionCreator.failedGetCookie(error)));
  };
}
