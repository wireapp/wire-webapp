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

import type {ConversationJoinData} from '../../../apiClient/conversation/data/conversationJoinData';
import type {BackendError} from '../../../apiClient/http/backendError';
import {JOIN_LINK_KIND} from '../../util/joinLink';
import {AppActions, CONVERSATION_ACTION} from '../action/creator/';

export interface ConversationState {
  error: (Error & {label?: string; code?: number; message?: string}) | null;
  fetched: boolean;
  fetching: boolean;
  conversationInfoFetching: boolean;
  conversationInfoError: BackendError | null;
  conversationInfo: ConversationJoinData | null;
  hasPassword: boolean;
}

export const initialConversationState: ConversationState = {
  error: null,
  fetched: false,
  fetching: false,
  conversationInfoFetching: false,
  conversationInfoError: null,
  conversationInfo: null,
  hasPassword: false,
};

export function conversationReducer(
  state: ConversationState = initialConversationState,
  action: AppActions,
): ConversationState {
  switch (action.type) {
    case CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START:
      return {
        ...state,
        error: null,
        fetching: true,
        hasPassword: false,
        ...(action.kind === JOIN_LINK_KIND.MEETING ? {conversationInfo: null} : {}),
      };
    case CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_START: {
      return {
        ...state,
        error: null,
        fetching: true,
      };
    }
    case CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_FAILED:
    case CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_SUCCESS:
      return {...state, fetching: false};
    case CONVERSATION_ACTION.JOIN_LINK_PASSWORD_REQUIRED:
      return {...state, fetching: false, hasPassword: true};
    case CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS:
    case CONVERSATION_ACTION.MEETING_CODE_JOIN_SUCCESS: {
      return {
        ...state,
        fetching: false,
      };
    }
    case CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_START: {
      return {
        ...state,
        conversationInfoFetching: true,
        conversationInfoError: null,
      };
    }
    case CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_FAILED: {
      return {
        ...state,
        conversationInfoFetching: false,
        conversationInfoError: null,
      };
    }
    case CONVERSATION_ACTION.CONVERSATION_CODE_GET_INFO_SUCCESS: {
      return {
        ...state,
        fetching: false,
        conversationInfoFetching: false,
        conversationInfoError: null,
        conversationInfo: {...state.conversationInfo, ...action.payload},
        hasPassword: action.payload.has_password,
      };
    }
    default: {
      return state;
    }
  }
}
