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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Maybe, Task, task} from 'true-myth';

import {STATE as CALL_STATE} from '@wireapp/avs';

import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {isMLSCapableConversation} from 'Repositories/conversation/ConversationSelectors';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {CallingViewModel} from 'src/script/view_model/CallingViewModel';

export const joinMeetingCallErrors = {
  conversationNotFound: 'conversationNotFound',
  joinFailed: 'joinFailed',
} as const;

export type JoinMeetingCallError = (typeof joinMeetingCallErrors)[keyof typeof joinMeetingCallErrors];

export type JoinMeetingCallDeps = {
  conversationState: ConversationState;
  conversationRepository: ConversationRepository;
  callingRepository: CallingRepository;
  callingViewModel: CallingViewModel;
};

const resolveConversation = (
  deps: JoinMeetingCallDeps,
  qualifiedConversationId: QualifiedId,
): Task<Conversation, JoinMeetingCallError> => {
  const localConversation = Maybe.of(deps.conversationState.findConversation(qualifiedConversationId));

  if (localConversation.isJust) {
    return task.resolve(localConversation.value);
  }

  return deps.conversationRepository
    .safeGetConversationById(qualifiedConversationId)
    .mapRejected(() => joinMeetingCallErrors.conversationNotFound);
};

/**
 * Meeting conversations are MLS group conversations that are not covered by
 * `isGroupOrChannel()`, so they can be missing from core-crypto after a fresh login.
 * Ensure the parent MLS group exists before creating the conference subconversation.
 */
const ensureMlsConversationReady = (
  deps: JoinMeetingCallDeps,
  conversation: Conversation,
): Task<Conversation, JoinMeetingCallError> => {
  if (!isMLSCapableConversation(conversation)) {
    return task.resolve(conversation);
  }

  return deps.conversationRepository
    .safeEnsureConversationExists({
      conversationId: conversation.qualifiedId,
      groupId: conversation.groupId,
    })
    .map(() => conversation)
    .mapRejected(() => joinMeetingCallErrors.joinFailed);
};

const performJoin = (deps: JoinMeetingCallDeps, conversation: Conversation): Task<void, JoinMeetingCallError> => {
  const call = deps.callingRepository.findCall(conversation.qualifiedId);

  if (call && call.state() === CALL_STATE.INCOMING) {
    return task.tryOrElse(
      () => joinMeetingCallErrors.joinFailed,
      () => deps.callingViewModel.callActions.answer(call),
    );
  }

  return task.tryOrElse(
    () => joinMeetingCallErrors.joinFailed,
    () => deps.callingViewModel.callActions.startAudio(conversation),
  );
};

/**
 * Joins or starts a call in the meeting's MLS conversation.
 * First joiner starts an outgoing call; subsequent joiners answer or are merged by SFT.
 */
export const joinMeetingCall = (
  deps: JoinMeetingCallDeps,
  qualifiedConversationId: QualifiedId,
): Task<void, JoinMeetingCallError> =>
  resolveConversation(deps, qualifiedConversationId)
    .andThen(conversation => ensureMlsConversationReady(deps, conversation))
    .andThen(conversation => performJoin(deps, conversation));
