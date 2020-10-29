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

import type {ConversationEvent} from '@wireapp/api-client/src/event';

import type {ThunkAction} from '../reducer';
import {ConversationActionCreator} from './creator/';

export class ConversationAction {
  doCheckConversationCode = (key: string, code: string, uri?: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startConversationCodeCheck());
      try {
        await apiClient.conversation.api.postConversationCodeCheck({code, key, uri});
        dispatch(ConversationActionCreator.successfulConversationCodeCheck());
      } catch (error) {
        dispatch(ConversationActionCreator.failedConversationCodeCheck(error));
        throw error;
      }
    };
  };

  doJoinConversationByCode = (key: string, code: string, uri?: string): ThunkAction<Promise<ConversationEvent>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startJoinConversationByCode());
      try {
        const conversationEvent = await apiClient.conversation.api.postJoinByCode({code, key, uri});
        dispatch(ConversationActionCreator.successfulJoinConversationByCode(conversationEvent));
        return conversationEvent;
      } catch (error) {
        dispatch(ConversationActionCreator.failedJoinConversationByCode(error));
        throw error;
      }
    };
  };
}
export const conversationAction = new ConversationAction();
