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

import type {ThunkAction} from '../reducer';
import * as CookieSelector from '../selector/CookieSelector';
import {CookieActionCreator} from './creator/';

const COOKIE_POLL_INTERVAL = 1000;

export class CookieAction {
  startPolling = (
    name: string = CookieSelector.COOKIE_NAME_APP_OPENED,
    interval: number = COOKIE_POLL_INTERVAL,
    asJSON: boolean = true,
  ): ThunkAction => {
    return async (dispatch, getState, {actions: {cookieAction}}) => {
      try {
        await dispatch(cookieAction.getCookie(name, asJSON));
        const timerId = window.setInterval(() => dispatch(cookieAction.getCookie(name, asJSON)), interval);
        dispatch(CookieActionCreator.startCookiePolling({name, timerId}));
      } catch (error) {
        dispatch(CookieActionCreator.failedCookiePolling(error));
      }
    };
  };

  stopPolling = (name: string = CookieSelector.COOKIE_NAME_APP_OPENED): ThunkAction => {
    return async (dispatch, getState, {}) => {
      try {
        const timerId = getState().cookieState.cookieTimer[name];
        if (timerId) {
          clearTimeout(timerId);
          dispatch(CookieActionCreator.stopCookiePolling({name, timerId}));
        }
      } catch (error) {
        dispatch(CookieActionCreator.failedCookiePolling(error));
      }
    };
  };

  getCookie = (name: string, asJSON: boolean = false): ThunkAction => {
    return async (dispatch, getState, {cookieStore}) => {
      try {
        const cookie = asJSON ? cookieStore.getJSON(name) : cookieStore.get(name);
        const previousCookie: object = CookieSelector.getCookies(getState())[name];
        const isCookieModified = JSON.stringify(previousCookie) !== JSON.stringify(cookie);
        if (isCookieModified) {
          dispatch(CookieActionCreator.successfulGetCookie({cookie, name}));
        }
      } catch (error) {
        dispatch(CookieActionCreator.failedGetCookie(error));
      }
    };
  };

  safelyRemoveCookie = (name: string, value: string): ThunkAction => {
    return async (dispatch, getState, {cookieStore}) => {
      try {
        const cookie = cookieStore.get(name);
        if (cookie?.includes(value)) {
          cookieStore.remove(name);
          dispatch(CookieActionCreator.successfulRemoveCookie({name}));
        }
      } catch (error) {
        dispatch(CookieActionCreator.failedRemoveCookie(error));
      }
    };
  };

  removeCookie = (name: string): ThunkAction => {
    return async (dispatch, getState, {cookieStore}) => {
      try {
        cookieStore.remove(name);
        dispatch(CookieActionCreator.successfulRemoveCookie({name}));
      } catch (error) {
        dispatch(CookieActionCreator.failedRemoveCookie(error));
      }
    };
  };

  setCookie = (name: string, value: object): ThunkAction => {
    return async (dispatch, getState, {cookieStore}) => {
      try {
        cookieStore.set(name, value);
        dispatch(CookieActionCreator.successfulSetCookie({name}));
      } catch (error) {
        dispatch(CookieActionCreator.failedSetCookie(error));
      }
    };
  };

  setCookieIfAbsent = (name: string, value: object): ThunkAction => {
    return async (dispatch, getState, {cookieStore}) => {
      try {
        if (!cookieStore.get(name)) {
          cookieStore.set(name, value);
          const cookie = cookieStore.get(name);
          dispatch(CookieActionCreator.successfulSetCookie({cookie, name}));
        }
      } catch (error) {
        dispatch(CookieActionCreator.failedSetCookie(error));
      }
    };
  };
}

export const cookieAction = new CookieAction();
