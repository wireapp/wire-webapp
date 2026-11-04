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

import type {ConversationJoinData} from '@wireapp/api-client/lib/conversation/data/conversationJoinData';
import type {ConversationEvent} from '@wireapp/api-client/lib/event/';
import type {BackendError} from '@wireapp/api-client/lib/http/';

import {JOIN_LINK_KIND} from '../../../util/joinLink';

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
  JOIN_LINK_PASSWORD_REQUIRED = 'JOIN_LINK_PASSWORD_REQUIRED',
  MEETING_CODE_JOIN_SUCCESS = 'MEETING_CODE_JOIN_SUCCESS',
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
  | JoinLinkPasswordRequiredAction
  | MeetingCodeJoinSuccessAction
  | ConversationCodeJoinFailedAction;

export interface ConversationCodeCheckStartAction extends AppAction {
  readonly type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START;
  readonly kind?: typeof JOIN_LINK_KIND.MEETING;
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

export interface MeetingCodeJoinSuccessAction extends AppAction {
  readonly type: CONVERSATION_ACTION.MEETING_CODE_JOIN_SUCCESS;
}

export interface JoinLinkPasswordRequiredAction extends AppAction {
  readonly type: CONVERSATION_ACTION.JOIN_LINK_PASSWORD_REQUIRED;
}

export class ConversationActionCreator {
  static startConversationCodeCheck = (kind?: typeof JOIN_LINK_KIND.MEETING): ConversationCodeCheckStartAction => {
    return {
      type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START,
      ...(kind === JOIN_LINK_KIND.MEETING ? {kind} : {}),
    };
  };
  static successfulConversationCodeCheck = (): ConversationCodeCheckSuccessAction => {
    return {
      type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_SUCCESS,
    };
  };
  static joinLinkPasswordRequired = (): JoinLinkPasswordRequiredAction => {
    return {type: CONVERSATION_ACTION.JOIN_LINK_PASSWORD_REQUIRED};
  };
  static failedConversationCodeCheck = (error: Error): ConversationCodeCheckFailedAction => {
    return {
      error,
      type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_FAILED,
    };
  };

  static startConversationCodeGetInfo = (): ConversationCodeGetInfoStartAction => {
    return {
      type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_START,
    };
  };
  static successfulConversationCodeGetInfo = (data: ConversationJoinData): ConversationCodeGetInfoSuccessAction => {
    return {
      payload: data,
      type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_SUCCESS,
    };
  };
  static failedConversationCodeGetInfo = (error: BackendError): ConversationCodeGetInfoFailedAction => {
    return {
      error,
      type: CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_FAILED,
    };
  };

  static startJoinConversationByCode = (): ConversationCodeJoinStartAction => {
    return {
      type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_START,
    };
  };
  static successfulJoinConversationByCode = (data: ConversationEvent): ConversationCodeJoinSuccessAction => {
    return {
      payload: data,
      type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS,
    };
  };
  static successfulJoinMeetingByCode = (): MeetingCodeJoinSuccessAction => {
    return {type: CONVERSATION_ACTION.MEETING_CODE_JOIN_SUCCESS};
  };
  static failedJoinConversationByCode = (error: Error | null): ConversationCodeJoinFailedAction => {
    return {
      error,
      type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_FAILED,
    };
  };
}
