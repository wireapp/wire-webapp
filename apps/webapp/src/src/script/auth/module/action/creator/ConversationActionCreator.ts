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

import type {ConversationJoinData} from '@wireapp/api-client/lib/conversation/data/ConversationJoinData';
import type {ConversationEvent} from '@wireapp/api-client/lib/event/';
import type {BackendError} from '@wireapp/api-client/lib/http/';

import type {AppAction} from '.';

export enum CONVERSATION_ACTION {
  CONVERSATION_CODE_CHECK_FAILED = 'CONVERSATION_CODE_CHECK_FAILED',
  CONVERSATION_CODE_CHECK_START = 'CONVERSATION_CODE_CHECK_START',
  CONVERSATION_CODE_CHECK_SUCCESS = 'CONVERSATION_CODE_CHECK_SUCCESS',
  CONVERSATION_CODE_GET_INFO_FAILED = 'CONVERSATION_CODE_GET_INFO_FAILED',
  CONVERSATION_CODE_GET_INFO_START = 'CONVERSATION_CODE_GET_INFO_START',
  CONVERSATION_CODE_GET_INFO_SUCCESS = 'CONVERSATION_CODE_GET_INFO_SUCCESS',
  CONVERSATION_CODE_JOIN_FAILED = 'CONVERSATION_CODE_JOIN_FAILED',
  CONVERSATION_CODE_JOIN_START = 'CONVERSATION_CODE_JOIN_START',
  CONVERSATION_CODE_JOIN_SUCCESS = 'CONVERSATION_CODE_JOIN_SUCCESS',
}

export type ConversationActions =
  | ConversationCodeCheckStartAction
  | ConversationCodeCheckSuccessAction
  | ConversationCodeCheckFailedAction
  | ConversationCodeGetInfoStartAction
  | ConversationCodeGetInfoSuccessAction
  | ConversationCodeGetInfoFailedAction
  | ConversationCodeJoinStartAction
  | ConversationCodeJoinSuccessAction
  | ConversationCodeJoinFailedAction;

export interface ConversationCodeCheckStartAction extends AppAction {
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START;
}
export interface ConversationCodeCheckSuccessAction extends AppAction {
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_SUCCESS;
}
export interface ConversationCodeCheckFailedAction extends AppAction {
  readonly error: Error;
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_FAILED;
}

export interface ConversationCodeGetInfoStartAction extends AppAction {
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_START;
}
export interface ConversationCodeGetInfoSuccessAction extends AppAction {
  readonly payload: ConversationJoinData;
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_SUCCESS;
}
export interface ConversationCodeGetInfoFailedAction extends AppAction {
  readonly error: BackendError;
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_FAILED;
}

export interface ConversationCodeJoinStartAction extends AppAction {
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_START;
}
export interface ConversationCodeJoinSuccessAction extends AppAction {
  readonly payload: ConversationEvent;
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS;
}
export interface ConversationCodeJoinFailedAction extends AppAction {
  readonly error: Error | null;
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_FAILED;
}

export class ConversationActionCreator {
  static startConversationCodeCheck = (): ConversationCodeCheckStartAction => ({
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START,
  });
  static successfulConversationCodeCheck = (): ConversationCodeCheckSuccessAction => ({
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_SUCCESS,
  });
  static failedConversationCodeCheck = (error: Error): ConversationCodeCheckFailedAction => ({
    error,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_FAILED,
  });

  static startConversationCodeGetInfo = (): ConversationCodeGetInfoStartAction => ({
    type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_START,
  });
  static successfulConversationCodeGetInfo = (data: ConversationJoinData): ConversationCodeGetInfoSuccessAction => ({
    payload: data,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_SUCCESS,
  });
  static failedConversationCodeGetInfo = (error: BackendError): ConversationCodeGetInfoFailedAction => ({
    error,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_FAILED,
  });

  static startJoinConversationByCode = (): ConversationCodeJoinStartAction => ({
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_START,
  });
  static successfulJoinConversationByCode = (data: ConversationEvent): ConversationCodeJoinSuccessAction => ({
    payload: data,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS,
  });
  static failedJoinConversationByCode = (error: Error | null): ConversationCodeJoinFailedAction => ({
    error,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_FAILED,
  });
}
