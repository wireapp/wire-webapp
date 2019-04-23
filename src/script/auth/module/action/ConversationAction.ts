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

import {ConversationEvent} from '@wireapp/api-client/dist/commonjs/event';
import {ThunkAction} from '../reducer';
import {ConversationActionCreator} from './creator/';

export class ConversationAction {
  doCheckConversationCode = (key: string, code: string, uri?: string): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startConversationCodeCheck());
      return Promise.resolve()
        .then(() => apiClient.conversation.api.postConversationCodeCheck({code, key, uri}))
        .then(() => {
          dispatch(ConversationActionCreator.successfulConversationCodeCheck());
        })
        .catch(error => {
          dispatch(ConversationActionCreator.failedConversationCodeCheck(error));
          throw error;
        });
    };
  };

  doJoinConversationByCode = (key: string, code: string, uri?: string): ThunkAction<Promise<ConversationEvent>> => {
    return (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startJoinConversationByCode());
      return Promise.resolve()
        .then(() => apiClient.conversation.api.postJoinByCode({code, key, uri}))
        .then(conversationEvent => {
          dispatch(ConversationActionCreator.successfulJoinConversationByCode(conversationEvent));
          return conversationEvent;
        })
        .catch(error => {
          dispatch(ConversationActionCreator.failedJoinConversationByCode(error));
          throw error;
        });
    };
  };
}
export const conversationAction = new ConversationAction();
