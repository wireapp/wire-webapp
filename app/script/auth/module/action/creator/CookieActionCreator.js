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

export const COOKIE_POLLING_STOP = 'COOKIE_POLLING_STOP';
export const COOKIE_POLLING_START = 'COOKIE_POLLING_START';
export const COOKIE_POLLING_FAILED = 'COOKIE_POLLING_FAILED';

export const COOKIE_GET_START = 'COOKIE_GET_START';
export const COOKIE_GET_SUCCESS = 'COOKIE_GET_SUCCESS';
export const COOKIE_GET_FAILED = 'COOKIE_GET_FAILED';

export const COOKIE_SET_START = 'COOKIE_SET_START';
export const COOKIE_SET_SUCCESS = 'COOKIE_SET_SUCCESS';
export const COOKIE_SET_FAILED = 'COOKIE_SET_FAILED';

export const stopCookiePolling = ({name, timerId}) => ({
  payload: {name, timerId},
  type: COOKIE_POLLING_STOP,
});

export const startCookiePolling = ({name, timerId}) => ({
  payload: {name, timerId},
  type: COOKIE_POLLING_START,
});

export const failedCookiePolling = error => ({
  payload: error,
  type: COOKIE_POLLING_FAILED,
});

export const successfulGetCookie = ({cookie, name}) => ({
  payload: {cookie, name},
  type: COOKIE_GET_SUCCESS,
});

export const failedGetCookie = error => ({
  payload: error,
  type: COOKIE_GET_FAILED,
});

export const startSetCookie = ({cookie, name}) => ({
  payload: {cookie, name},
  type: COOKIE_SET_SUCCESS,
});

export const successfulSetCookie = ({cookie, name}) => ({
  payload: {cookie, name},
  type: COOKIE_SET_SUCCESS,
});

export const failedSetCookie = error => ({
  payload: error,
  type: COOKIE_SET_FAILED,
});
