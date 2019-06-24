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

import {ThunkAction} from '../reducer';
import * as CookieSelector from '../selector/CookieSelector';
import {CookieActionCreator} from './creator/';

const COOKIE_POLL_INTERVAL = 1000;

export class CookieAction {
  startPolling = (
    name: string = CookieSelector.COOKIE_NAME_APP_OPENED,
    interval: number = COOKIE_POLL_INTERVAL,
    asJSON: boolean = true
  ): ThunkAction => {
    return (dispatch, getState, {actions: {cookieAction}}) => {
      return Promise.resolve()
        .then(() => dispatch(cookieAction.getCookie(name, asJSON)))
        .then(() => window.setInterval(() => dispatch(cookieAction.getCookie(name, asJSON)), interval))
        .then(timerId => {
          dispatch(CookieActionCreator.startCookiePolling({name, timerId}));
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedCookiePolling(error));
        });
    };
  };

  stopPolling = (name: string): ThunkAction => {
    return (dispatch, getState, {}) => {
      return Promise.resolve()
        .then(() => {
          const timerId = getState().cookieState.cookieTimer[name];
          if (timerId) {
            clearTimeout(timerId);
            dispatch(CookieActionCreator.stopCookiePolling({name, timerId}));
          }
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedCookiePolling(error));
        });
    };
  };

  getCookie = (name: string, asJSON: boolean = false): ThunkAction => {
    return (dispatch, getState, {cookieStore}) => {
      return Promise.resolve(asJSON ? cookieStore.getJSON(name) : cookieStore.get(name))
        .then(cookie => {
          const previousCookie: object = CookieSelector.getCookies(getState())[name];
          const isCookieModified = JSON.stringify(previousCookie) !== JSON.stringify(cookie);
          if (isCookieModified) {
            dispatch(CookieActionCreator.successfulGetCookie({cookie, name}));
          }
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedGetCookie(error));
        });
    };
  };

  safelyRemoveCookie = (name: string, value: string): ThunkAction => {
    return (dispatch, getState, {cookieStore}) => {
      return Promise.resolve()
        .then(() => {
          const cookie = cookieStore.get(name);
          if (cookie && cookie.includes(value)) {
            cookieStore.remove(name);
            dispatch(CookieActionCreator.successfulRemoveCookie({name}));
          }
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedRemoveCookie(error));
        });
    };
  };

  removeCookie = (name: string): ThunkAction => {
    return (dispatch, getState, {cookieStore}) => {
      return Promise.resolve()
        .then(() => {
          cookieStore.remove(name);
          dispatch(CookieActionCreator.successfulRemoveCookie({name}));
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedRemoveCookie(error));
        });
    };
  };

  setCookie = (name: string, value: object): ThunkAction => {
    return (dispatch, getState, {cookieStore}) => {
      return Promise.resolve(cookieStore.set(name, value))
        .then(() => {
          dispatch(CookieActionCreator.successfulSetCookie({name}));
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedSetCookie(error));
        });
    };
  };

  setCookieIfAbsent = (name: string, value: object): ThunkAction => {
    return (dispatch, getState, {cookieStore}) => {
      return Promise.resolve()
        .then(() => {
          if (!cookieStore.get(name)) {
            cookieStore.set(name, value);
            const cookie = cookieStore.get(name);
            dispatch(CookieActionCreator.successfulSetCookie({cookie, name}));
          }
        })
        .catch(error => {
          dispatch(CookieActionCreator.failedSetCookie(error));
        });
    };
  };
}

export const cookieAction = new CookieAction();
