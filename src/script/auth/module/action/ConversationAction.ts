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

import type {ConversationEvent} from '@wireapp/api-client/lib/event/';

import {joinCodeFlowFinalizer} from 'src/script/conversation/joinCodeFlowFinalizer';

import {ConversationActionCreator} from './creator/';

import type {ThunkAction} from '../reducer';

export class ConversationAction {
  doCheckConversationCode = (key: string, code: string, uri?: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startConversationCodeCheck());
      try {
        await apiClient.api.conversation.postConversationCodeCheck({code, key, uri});
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
        const conversationEvent = await apiClient.api.conversation.postJoinByCode({code, key, uri});

        // if we've succesfully joined conversation, we start finalizing the join code flow
        // some services (eg. mls) are not initialised at this point of app lifecycle (on /join page) so we have to wait for app to initialise after reload
        const conversationId = conversationEvent.qualified_conversation;
        if (conversationId) {
          joinCodeFlowFinalizer.init(conversationId);
        }

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
