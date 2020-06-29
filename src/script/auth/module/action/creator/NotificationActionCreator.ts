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

export enum NOTIFICATION_ACTION {
  NOTIFICATION_CHECK_HISTORY_FAILED = 'NOTIFICATION_CHECK_HISTORY_FAILED',
  NOTIFICATION_CHECK_HISTORY_RESET = 'NOTIFICATION_CHECK_HISTORY_RESET',
  NOTIFICATION_CHECK_HISTORY_START = 'NOTIFICATION_CHECK_HISTORY_START',
  NOTIFICATION_CHECK_HISTORY_SUCCESS = 'NOTIFICATION_CHECK_HISTORY_SUCCESS',
}

export type NotificationActions =
  | HistoryCheckStartAction
  | HistoryCheckSuccessAction
  | HistoryCheckFailedAction
  | HistoryCheckResetAction;

export interface HistoryCheckStartAction extends AppAction {
  readonly type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_START;
}
export interface HistoryCheckSuccessAction extends AppAction {
  readonly payload: boolean;
  readonly type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_SUCCESS;
}
export interface HistoryCheckFailedAction extends AppAction {
  readonly error: Error;
  readonly type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_FAILED;
}

export interface HistoryCheckResetAction extends AppAction {
  readonly type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_RESET;
}

export class NotificationActionCreator {
  static startCheckHistory = (): HistoryCheckStartAction => ({
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_START,
  });
  static successfulCheckHistory = (hasHistory: boolean): HistoryCheckSuccessAction => ({
    payload: hasHistory,
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_SUCCESS,
  });
  static failedCheckHistory = (error: Error): HistoryCheckFailedAction => ({
    error,
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_FAILED,
  });

  static resetHistoryCheck = (): HistoryCheckResetAction => ({
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_RESET,
  });
}
