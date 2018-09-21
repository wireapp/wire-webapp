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

import {AppAction} from ".";

export enum COOKIE_ACTION {
  COOKIE_POLLING_STOP = 'COOKIE_POLLING_STOP',
  COOKIE_POLLING_START = 'COOKIE_POLLING_START',
  COOKIE_POLLING_FAILED = 'COOKIE_POLLING_FAILED',

  COOKIE_GET_START = 'COOKIE_GET_START',
  COOKIE_GET_SUCCESS = 'COOKIE_GET_SUCCESS',
  COOKIE_GET_FAILED = 'COOKIE_GET_FAILED',

  COOKIE_SET_START = 'COOKIE_SET_START',
  COOKIE_SET_SUCCESS = 'COOKIE_SET_SUCCESS',
  COOKIE_SET_FAILED = 'COOKIE_SET_FAILED',

  COOKIE_REMOVE_START = 'COOKIE_REMOVE_START',
  COOKIE_REMOVE_SUCCESS = 'COOKIE_REMOVE_SUCCESS',
  COOKIE_REMOVE_FAILED = 'COOKIE_REMOVE_FAILED',
}

export type CookieActions =
  | typeof CookieActionCreator.stopCookiePolling & AppAction
  | typeof CookieActionCreator.startCookiePolling & AppAction
  | typeof CookieActionCreator.failedCookiePolling & AppAction
  | typeof CookieActionCreator.successfulGetCookie & AppAction
  | typeof CookieActionCreator.failedGetCookie & AppAction
  | typeof CookieActionCreator.startSetCookie & AppAction
  | typeof CookieActionCreator.successfulSetCookie & AppAction
  | typeof CookieActionCreator.failedSetCookie & AppAction
  | typeof CookieActionCreator.startRemoveCookie & AppAction
  | typeof CookieActionCreator.successfulRemoveCookie & AppAction
  | typeof CookieActionCreator.failedRemoveCookie & AppAction
  ;

export class CookieActionCreator {
  static stopCookiePolling = ({name, timerId}) => ({
    payload: {name, timerId},
    type: COOKIE_ACTION.COOKIE_POLLING_STOP,
  });

  static startCookiePolling = ({name, timerId}) => ({
    payload: {name, timerId},
    type: COOKIE_ACTION.COOKIE_POLLING_START,
  });

  static failedCookiePolling = (error?: any) => ({
    payload: error,
    type: COOKIE_ACTION.COOKIE_POLLING_FAILED,
  });

  static successfulGetCookie = ({cookie, name}) => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_GET_SUCCESS,
  });

  static failedGetCookie = (error?: any) => ({
    payload: error,
    type: COOKIE_ACTION.COOKIE_GET_FAILED,
  });

  static startSetCookie = ({cookie, name}) => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_SET_SUCCESS,
  });

  static successfulSetCookie = ({cookie, name}: {cookie?: string; name: string}) => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_SET_SUCCESS,
  });

  static failedSetCookie = (error?: any) => ({
    payload: error,
    type: COOKIE_ACTION.COOKIE_SET_FAILED,
  });

  static startRemoveCookie = ({cookie, name}) => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_REMOVE_SUCCESS,
  });

  static successfulRemoveCookie = (name: string) => ({
    payload: {name},
    type: COOKIE_ACTION.COOKIE_REMOVE_SUCCESS,
  });

  static failedRemoveCookie = (error?: any) => ({
    payload: error,
    type: COOKIE_ACTION.COOKIE_REMOVE_FAILED,
  });
}
