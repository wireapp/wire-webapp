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

import * as ConversationActionCreator from './creator/ConversationActionCreator';

export function doCheckConversationCode(key, code, uri) {
  const params = [...arguments];
  return function(dispatch, getState, {apiClient}) {
    dispatch(ConversationActionCreator.startConversationCodeCheck(params));
    return Promise.resolve()
      .then(() => apiClient.conversation.api.postConversationCodeCheck({code, key, uri}))
      .then(() => dispatch(ConversationActionCreator.successfulConversationCodeCheck()))
      .catch(error => {
        dispatch(ConversationActionCreator.failedConversationCodeCheck(error));
        throw error;
      });
  };
}

export function doJoinConversationByCode(key, code, uri) {
  const params = [...arguments];
  return function(dispatch, getState, {apiClient}) {
    dispatch(ConversationActionCreator.startJoinConversationByCode(params));
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
}
