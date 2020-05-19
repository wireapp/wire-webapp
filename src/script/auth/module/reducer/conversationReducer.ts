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

import {AppActions, CONVERSATION_ACTION} from '../action/creator/';

export interface ConversationState {
  error: Error & {label?: string};
  fetched: boolean;
  fetching: boolean;
}

export const initialConversationState: ConversationState = {
  error: null,
  fetched: false,
  fetching: false,
};

export function conversationReducer(
  state: ConversationState = initialConversationState,
  action: AppActions,
): ConversationState {
  switch (action.type) {
    case CONVERSATION_ACTION.CONVERSATION_CODE_CHECK_START:
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
    case CONVERSATION_ACTION.CONVERSATION_CODE_JOIN_SUCCESS: {
      return {
        ...state,
        fetching: false,
      };
    }
    default: {
      return state;
    }
  }
}
