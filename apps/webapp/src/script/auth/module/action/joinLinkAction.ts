/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isNullOrUndefined, isUndefined} from '@sindresorhus/is';
import {StatusCodes} from 'http-status-codes';

import {ConversationActionCreator} from './creator';
import {LocalStorageKey} from './localStorageKeys';

import {Config} from '../../../Config';
import {
  joinedMeetingDestinationSchema,
  type JoinLinkResult,
  loginJoinDestination,
} from '../../../navigation/meetingJoinDestination';
import {toError} from '../../../util/toError';
import {type MeetingLink} from '../../util/joinLink';
import type {ThunkAction} from '../reducer';

const disableRetries = {'axios-retry': {retries: 0}};

function meetingLinkUrl(link: MeetingLink, apiVersion: number): string {
  if (apiVersion < Config.getConfig().MIN_MEETINGS_SUPPORTED_API_VERSION) {
    throw Object.assign(new Error('Meeting links require API v19 or newer'), {label: 'meeting-api-unsupported'});
  }
  if (link.domain.length === 0 || link.key.length === 0 || link.code.length === 0) {
    throw Object.assign(new Error('Invalid meeting link'), {label: 'meeting-not-found', code: StatusCodes.NOT_FOUND});
  }
  return `/meeting/${encodeURIComponent(link.domain)}/${encodeURIComponent(link.key)}/${encodeURIComponent(link.code)}`;
}

export class JoinLinkAction {
  doStoreJoinDestination = (result: JoinLinkResult): ThunkAction => {
    return async (dispatch, getState, {actions: {localStorageAction}}) => {
      await dispatch(
        localStorageAction.setLocalStorage(LocalStorageKey.AUTH.LOGIN_CONVERSATION_KEY, loginJoinDestination(result)),
      );
    };
  };

  doCheckJoinLink = (key: string, code: string, uri?: string): ThunkAction => {
    return async (dispatch, getState, {actions: {conversationAction}}) => {
      await dispatch(conversationAction.doCheckConversationCode(key, code, uri));
      await dispatch(conversationAction.doGetConversationInfoByCode(key, code));
    };
  };

  doCheckMeetingLink = (link: MeetingLink, password?: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      await apiClient.transport.http.sendJSON({
        method: 'get',
        url: `${meetingLinkUrl(link, apiClient.backendFeatures.version)}/code-check`,
        ...(isUndefined(password) ? {} : {params: {password}}),
        ...disableRetries,
      });
    };
  };

  doJoinByLink = (
    key: string,
    code: string,
    uri?: string,
    password?: string,
  ): ThunkAction<Promise<JoinLinkResult | undefined>> => {
    return async (dispatch, getState, {actions: {conversationAction}}) => {
      const event = await dispatch(conversationAction.doJoinConversationByCode(key, code, uri, password));
      if (isNullOrUndefined(event)) {
        return undefined;
      }
      return {
        conversation: {id: event.conversation, domain: event.qualified_conversation?.domain ?? ''},
        eventTime: event.time,
      };
    };
  };

  doJoinMeetingLink = (link: MeetingLink, password?: string): ThunkAction<Promise<JoinLinkResult>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ConversationActionCreator.startJoinConversationByCode());
      try {
        const response = await apiClient.transport.http.sendJSON<unknown>({
          method: 'post',
          url: `${meetingLinkUrl(link, apiClient.backendFeatures.version)}/join`,
          params: isUndefined(password) ? undefined : {password},
          ...disableRetries,
        });
        const destination = joinedMeetingDestinationSchema.parse(response.data);
        dispatch(ConversationActionCreator.successfulJoinMeetingByCode());
        return destination;
      } catch (error: unknown) {
        dispatch(ConversationActionCreator.failedJoinConversationByCode(toError(error)));
        throw error;
      }
    };
  };
}

export const joinLinkAction = new JoinLinkAction();
