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

export enum CONVERSATION_ACTION {
  CONVERSATION_CODE_CHECK_START = 'CONVERSATION_CODE_CHECK_START',
  CONVERSATION_CODE_CHECK_SUCCESS = 'CONVERSATION_CODE_CHECK_SUCCESS',
  CONVERSATION_CODE_CHECK_FAILED = 'CONVERSATION_CODE_CHECK_FAILED',

  CONVERSATION_CODE_JOIN_START = 'CONVERSATION_CODE_JOIN_START',
  CONVERSATION_CODE_JOIN_SUCCESS = 'CONVERSATION_CODE_JOIN_SUCCESS',
  CONVERSATION_CODE_JOIN_FAILED = 'CONVERSATION_CODE_JOIN_FAILED',
}

export type ConversationActions = any;

export class ConversationActionCreator {
  static startConversationCodeCheck = (params?: any) => ({
    params,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START,
  });

  static successfulConversationCodeCheck = () => ({
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_SUCCESS,
  });

  static failedConversationCodeCheck = (error?: any) => ({
    payload: error,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_FAILED,
  });

  static startJoinConversationByCode = (params?: any) => ({
    params,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_START,
  });

  static successfulJoinConversationByCode = data => ({
    payload: data,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS,
  });

  static failedJoinConversationByCode = (error?: any) => ({
    payload: error,
    type: CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_FAILED,
  });
}
