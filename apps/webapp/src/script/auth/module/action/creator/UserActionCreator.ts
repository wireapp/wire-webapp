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

export enum USER_ACTION {
  USER_SEND_ACTIVATION_CODE_FAILED = 'USER_SEND_ACTIVATION_CODE_FAILED',
  USER_SEND_ACTIVATION_CODE_START = 'USER_SEND_ACTIVATION_CODE_START',
  USER_SEND_ACTIVATION_CODE_SUCCESS = 'USER_SEND_ACTIVATION_CODE_SUCCESS',
}

export type UserActions =
  | SendActivationCodeStartAction
  | SendActivationCodeSuccessAction
  | SendActivationCodeFailedAction;

export interface SendActivationCodeStartAction extends AppAction {
  readonly type: USER_ACTION.USER_SEND_ACTIVATION_CODE_START;
}
export interface SendActivationCodeSuccessAction extends AppAction {
  readonly type: USER_ACTION.USER_SEND_ACTIVATION_CODE_SUCCESS;
}
export interface SendActivationCodeFailedAction extends AppAction {
  readonly error: Error;
  readonly type: USER_ACTION.USER_SEND_ACTIVATION_CODE_FAILED;
}

export class UserActionCreator {
  static startSendActivationCode = (): SendActivationCodeStartAction => ({
    type: USER_ACTION.USER_SEND_ACTIVATION_CODE_START,
  });
  static successfulSendActivationCode = (): SendActivationCodeSuccessAction => ({
    type: USER_ACTION.USER_SEND_ACTIVATION_CODE_SUCCESS,
  });
  static failedSendActivationCode = (error: Error): SendActivationCodeFailedAction => ({
    error,
    type: USER_ACTION.USER_SEND_ACTIVATION_CODE_FAILED,
  });
}
