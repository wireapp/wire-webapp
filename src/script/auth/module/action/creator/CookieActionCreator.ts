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

import type {AppAction} from '.';

export enum COOKIE_ACTION {
  COOKIE_GET_FAILED = 'COOKIE_GET_FAILED',
  COOKIE_GET_START = 'COOKIE_GET_START',
  COOKIE_GET_SUCCESS = 'COOKIE_GET_SUCCESS',

  COOKIE_POLLING_FAILED = 'COOKIE_POLLING_FAILED',
  COOKIE_POLLING_START = 'COOKIE_POLLING_START',
  COOKIE_POLLING_STOP = 'COOKIE_POLLING_STOP',

  COOKIE_REMOVE_FAILED = 'COOKIE_REMOVE_FAILED',
  COOKIE_REMOVE_START = 'COOKIE_REMOVE_START',
  COOKIE_REMOVE_SUCCESS = 'COOKIE_REMOVE_SUCCESS',

  COOKIE_SET_FAILED = 'COOKIE_SET_FAILED',
  COOKIE_SET_START = 'COOKIE_SET_START',
  COOKIE_SET_SUCCESS = 'COOKIE_SET_SUCCESS',
}

export type CookieActions =
  | CookiePollingStartAction
  | CookiePollingStopAction
  | CookiePollingFailedAction
  | CookieGetStartAction
  | CookieGetSuccessAction
  | CookieGetFailedAction
  | CookieSetStartAction
  | CookieSetSuccessAction
  | CookieSetFailedAction
  | CookieRemoveStartAction
  | CookieRemoveSuccessAction
  | CookieRemoveFailedAction;

export interface CookiePollingStartAction extends AppAction {
  readonly payload: {name: string; timerId: number};
  readonly type: COOKIE_ACTION.COOKIE_POLLING_START;
}
export interface CookiePollingStopAction extends AppAction {
  readonly payload: {name: string; timerId: number};
  readonly type: COOKIE_ACTION.COOKIE_POLLING_STOP;
}
export interface CookiePollingFailedAction extends AppAction {
  readonly error: Error;
  readonly type: COOKIE_ACTION.COOKIE_POLLING_FAILED;
}

export interface CookieGetStartAction extends AppAction {
  readonly params: string;
  readonly type: COOKIE_ACTION.COOKIE_GET_START;
}
export interface CookieGetSuccessAction extends AppAction {
  payload: {cookie: object; name: string};
  readonly type: COOKIE_ACTION.COOKIE_GET_SUCCESS;
}
export interface CookieGetFailedAction extends AppAction {
  readonly error: Error;
  readonly type: COOKIE_ACTION.COOKIE_GET_FAILED;
}

export interface CookieSetStartAction extends AppAction {
  readonly params: {cookie: string; name: string};
  readonly type: COOKIE_ACTION.COOKIE_SET_START;
}
export interface CookieSetSuccessAction extends AppAction {
  readonly payload: {cookie: string; name: string};
  readonly type: COOKIE_ACTION.COOKIE_SET_SUCCESS;
}
export interface CookieSetFailedAction extends AppAction {
  readonly error: Error;
  readonly type: COOKIE_ACTION.COOKIE_SET_FAILED;
}

export interface CookieRemoveStartAction extends AppAction {
  readonly params: {cookie: string; name: string};
  readonly type: COOKIE_ACTION.COOKIE_REMOVE_START;
}
export interface CookieRemoveSuccessAction extends AppAction {
  readonly payload: {cookie: string; name: string};
  readonly type: COOKIE_ACTION.COOKIE_REMOVE_SUCCESS;
}
export interface CookieRemoveFailedAction extends AppAction {
  readonly error: Error;
  readonly type: COOKIE_ACTION.COOKIE_REMOVE_FAILED;
}

export class CookieActionCreator {
  static startCookiePolling = ({name, timerId}: {name: string; timerId: number}): CookiePollingStartAction => ({
    payload: {name, timerId},
    type: COOKIE_ACTION.COOKIE_POLLING_START,
  });
  static stopCookiePolling = ({name, timerId}: {name: string; timerId: number}): CookiePollingStopAction => ({
    payload: {name, timerId},
    type: COOKIE_ACTION.COOKIE_POLLING_STOP,
  });
  static failedCookiePolling = (error: Error): CookiePollingFailedAction => ({
    error,
    type: COOKIE_ACTION.COOKIE_POLLING_FAILED,
  });

  static startGetCookie = (name: string): CookieGetStartAction => ({
    params: name,
    type: COOKIE_ACTION.COOKIE_GET_START,
  });
  static successfulGetCookie = ({cookie, name}: {cookie: object; name: string}): CookieGetSuccessAction => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_GET_SUCCESS,
  });
  static failedGetCookie = (error: Error): CookieGetFailedAction => ({
    error,
    type: COOKIE_ACTION.COOKIE_GET_FAILED,
  });

  static startSetCookie = ({cookie, name}: {cookie: string; name: string}): CookieSetStartAction => ({
    params: {cookie, name},
    type: COOKIE_ACTION.COOKIE_SET_START,
  });
  static successfulSetCookie = ({cookie, name}: {cookie?: string; name: string}): CookieSetSuccessAction => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_SET_SUCCESS,
  });
  static failedSetCookie = (error: Error): CookieSetFailedAction => ({
    error,
    type: COOKIE_ACTION.COOKIE_SET_FAILED,
  });

  static startRemoveCookie = ({cookie, name}: {cookie: string; name: string}): CookieRemoveStartAction => ({
    params: {cookie, name},
    type: COOKIE_ACTION.COOKIE_REMOVE_START,
  });
  static successfulRemoveCookie = ({cookie, name}: {cookie?: string; name: string}): CookieRemoveSuccessAction => ({
    payload: {cookie, name},
    type: COOKIE_ACTION.COOKIE_REMOVE_SUCCESS,
  });
  static failedRemoveCookie = (error: Error): CookieRemoveFailedAction => ({
    error,
    type: COOKIE_ACTION.COOKIE_REMOVE_FAILED,
  });
}
