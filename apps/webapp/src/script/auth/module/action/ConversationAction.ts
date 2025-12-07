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
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {isBackendError} from 'Util/TypePredicateUtil';

import {ConversationActionCreator} from './creator/';

import type {ThunkAction} from '../reducer';
import {isError} from 'underscore';

export class ConversationAction {
  doCheckConversationCode = (key: string, code: string, uri?: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startConversationCodeCheck());
      try {
        await apiClient.api.conversation.postConversationCodeCheck({code, key, uri});
        dispatch(ConversationActionCreator.successfulConversationCodeCheck());
      } catch (error) {
        if (isError(error)) {
          dispatch(ConversationActionCreator.failedConversationCodeCheck(error));
        }
        throw error;
      }
    };
  };

  doJoinConversationByCode = (
    key: string,
    code: string,
    uri?: string,
    password?: string,
  ): ThunkAction<Promise<ConversationEvent>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startJoinConversationByCode());
      try {
        const conversationEvent = await apiClient.api.conversation.postJoinByCode({code, key, uri, password});
        dispatch(ConversationActionCreator.successfulJoinConversationByCode(conversationEvent));
        return conversationEvent;
      } catch (error) {
        /*
          Backend does return a password-invalid error even though we have not submitted any password
          expected: passsword-required.
          received: password-invalid.
          we have to dispatch conversation info with has_password field in order to handle error message in JoinGuestLinkPasswordModal properly.
        */
        if (isBackendError(error) && !password && error.code === HTTP_STATUS.FORBIDDEN) {
          dispatch(
            ConversationActionCreator.successfulConversationCodeGetInfo({
              has_password: true,
            } as ConversationJoinData),
          );
          throw error;
        }
        dispatch(ConversationActionCreator.failedJoinConversationByCode(error));
        throw error;
      }
    };
  };

  doGetConversationInfoByCode = (key: string, code: string): ThunkAction<Promise<ConversationJoinData | undefined>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startConversationCodeGetInfo());
      try {
        const conversationInfo = await apiClient.api.conversation.getJoinByCode({code, key});
        dispatch(ConversationActionCreator.successfulConversationCodeGetInfo(conversationInfo));
        return conversationInfo;
      } catch (error) {
        if (isBackendError(error)) {
          dispatch(ConversationActionCreator.failedConversationCodeGetInfo(error));
          return undefined;
        }
        throw error;
      }
    };
  };
}
export const conversationAction = new ConversationAction();
