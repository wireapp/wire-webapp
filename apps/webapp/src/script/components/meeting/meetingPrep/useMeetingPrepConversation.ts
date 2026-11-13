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

import {useMemo} from 'react';

import ko from 'knockout';
import {Maybe, maybe} from 'true-myth';
import {container} from 'tsyringe';

import {isMeetingCallInProgress} from './isMeetingCallInProgress';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {CallState} from '../../../repositories/calling/CallState';
import {ConversationState} from '../../../repositories/conversation/ConversationState';
import type {User} from '../../../repositories/entity/User';
import {UserState} from '../../../repositories/user/userState';
import {useKoSubscribableChildren} from '../../../util/componentUtil';
import {matchQualifiedIds} from '../../../util/qualifiedId';

type MeetingPrepConversation = {
  readonly isCallInProgress: boolean;
  readonly invitees: readonly User[];
};

/**
 * What the green room shows about the meeting conversation: whether people are already in its call,
 * and who is invited (the user first). A temporary guest sees no invitees.
 *
 * The conversation list and the call list are mutated in place, so both are read inside computeds,
 * which re-run when an item is added or removed, or when a call changes state.
 */
export const useMeetingPrepConversation = (qualifiedConversationId: Maybe<QualifiedId>): MeetingPrepConversation => {
  const callState = container.resolve(CallState);
  const conversationState = container.resolve(ConversationState);
  const selfUser = container.resolve(UserState).self();
  // Keyed on the id's values, so a caller that builds a new Maybe on every render does not restart the subscriptions.
  const hasConversationId = qualifiedConversationId.isJust;
  const conversationIdValue = qualifiedConversationId.mapOr('', ({id}) => {
    return id;
  });
  const conversationDomain = qualifiedConversationId.mapOr('', ({domain}) => {
    return domain;
  });

  const source = useMemo(() => {
    const targetConversationId: Maybe<QualifiedId> = hasConversationId
      ? Maybe.just({id: conversationIdValue, domain: conversationDomain})
      : Maybe.nothing();

    return {
      participatingUsers: ko.pureComputed(() => {
        return targetConversationId
          .andThen(conversationId => {
            return maybe.find(conversation => {
              return matchQualifiedIds(conversation.qualifiedId, conversationId);
            }, conversationState.conversations());
          })
          .mapOr([], conversation => {
            // A copy: the list is mutated in place, and React only sees a new array.
            return [...conversation.participating_user_ets()];
          });
      }),
      isConversationKnown: ko.pureComputed(() => {
        return targetConversationId.mapOr(false, conversationId => {
          return conversationState.conversations().some(conversation => {
            return matchQualifiedIds(conversation.qualifiedId, conversationId);
          });
        });
      }),
      isCallInProgress: ko.pureComputed(() => {
        return targetConversationId.mapOr(false, conversationId => {
          const calls = callState.calls().map(call => {
            return {qualifiedConversationId: call.conversation.qualifiedId, state: call.state()};
          });
          return isMeetingCallInProgress(calls, conversationId);
        });
      }),
    };
  }, [callState, conversationDomain, conversationIdValue, conversationState, hasConversationId]);

  const {participatingUsers, isConversationKnown, isCallInProgress} = useKoSubscribableChildren(source, [
    'participatingUsers',
    'isConversationKnown',
    'isCallInProgress',
  ]);

  const invitees = useMemo(() => {
    if (selfUser.isTemporaryGuest() || !isConversationKnown) {
      return [];
    }
    return [selfUser, ...participatingUsers];
  }, [isConversationKnown, participatingUsers, selfUser]);

  return {isCallInProgress, invitees};
};
