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

export const CONVERSATION_CODE_CHECK_START = 'CONVERSATION_CODE_CHECK_START';
export const CONVERSATION_CODE_CHECK_SUCCESS = 'CONVERSATION_CODE_CHECK_SUCCESS';
export const CONVERSATION_CODE_CHECK_FAILED = 'CONVERSATION_CODE_CHECK_FAILED';

export const CONVERSATION_CODE_JOIN_START = 'CONVERSATION_CODE_JOIN_START';
export const CONVERSATION_CODE_JOIN_SUCCESS = 'CONVERSATION_CODE_JOIN_SUCCESS';
export const CONVERSATION_CODE_JOIN_FAILED = 'CONVERSATION_CODE_JOIN_FAILED';

export const startConversationCodeCheck = params => ({
  params,
  type: CONVERSATION_CODE_CHECK_START,
});

export const successfulConversationCodeCheck = () => ({
  type: CONVERSATION_CODE_CHECK_SUCCESS,
});

export const failedConversationCodeCheck = error => ({
  payload: error,
  type: CONVERSATION_CODE_CHECK_FAILED,
});

export const startJoinConversationByCode = params => ({
  params,
  type: CONVERSATION_CODE_JOIN_START,
});

export const successfulJoinConversationByCode = data => ({
  payload: data,
  type: CONVERSATION_CODE_JOIN_SUCCESS,
});

export const failedJoinConversationByCode = error => ({
  payload: error,
  type: CONVERSATION_CODE_JOIN_FAILED,
});
