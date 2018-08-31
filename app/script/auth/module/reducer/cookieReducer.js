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

import * as CookieActionCreator from '../action/creator/CookieActionCreator';

export const initialState = {
  cookieTimer: {},
  cookies: {},
  error: null,
  fetched: false,
  fetching: false,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case CookieActionCreator.COOKIE_POLLING_START: {
      const {name, timerId} = action.payload;
      return {
        ...state,
        cookieTimer: {
          ...state.cookieTimer,
          [name]: timerId,
        },
        error: null,
      };
    }
    case CookieActionCreator.COOKIE_POLLING_STOP: {
      const {name} = action.payload;
      const cookieTimerTemp = {...state.cookieTimer};
      delete cookieTimerTemp[name];
      return {
        ...state,
        cookieTimer: {
          ...cookieTimerTemp,
        },
        error: null,
      };
    }
    case CookieActionCreator.COOKIE_POLLING_FAILED: {
      return {
        ...state,
        error: action.payload,
      };
    }
    case CookieActionCreator.COOKIE_GET_START: {
      return {
        ...state,
        error: null,
        fetching: true,
      };
    }
    case CookieActionCreator.COOKIE_GET_SUCCESS: {
      const {name, cookie} = action.payload;
      return {
        ...state,
        cookies: {
          ...state.cookies,
          [name]: cookie,
        },
        error: null,
        fetching: false,
      };
    }
    case CookieActionCreator.COOKIE_GET_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    default: {
      return state;
    }
  }
}
