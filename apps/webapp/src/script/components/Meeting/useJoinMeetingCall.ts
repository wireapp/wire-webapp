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

import {useCallback, useEffect, useMemo, useState} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {STATE as CALL_STATE} from '@wireapp/avs';

import {joinMeetingCall, joinMeetingCallErrors, type JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import {CallState} from 'Repositories/calling/CallState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Config} from 'src/script/Config';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

const useMeetingConversationCall = (qualifiedConversationId: QualifiedId) => {
  const callState = container.resolve(CallState);
  const {calls, joinedCall} = useKoSubscribableChildren(callState, ['calls', 'joinedCall']);

  const isCallActive =
    joinedCall !== undefined && matchQualifiedIds(joinedCall.conversation.qualifiedId, qualifiedConversationId);

  const call = useMemo(
    () => calls.find(callInstance => matchQualifiedIds(callInstance.conversation.qualifiedId, qualifiedConversationId)),
    [calls, qualifiedConversationId],
  );

  const [connectingCallState, setConnectingCallState] = useState<CALL_STATE | null>(() =>
    isCallActive ? null : (call?.state() ?? null),
  );

  useEffect(() => {
    if (!call || isCallActive) {
      setConnectingCallState(null);
      return () => {};
    }

    setConnectingCallState(call.state());

    const subscription = call.state.subscribe(newState => {
      setConnectingCallState(newState);
    });

    return () => {
      subscription.dispose();
    };
  }, [call, isCallActive]);

  const isCallConnecting =
    !isCallActive &&
    connectingCallState !== null &&
    (connectingCallState === CALL_STATE.ANSWERED || connectingCallState === CALL_STATE.OUTGOING);

  return {isCallConnecting, isCallActive};
};

export const useJoinMeetingCall = (qualifiedConversationId: QualifiedId) => {
  const {translate} = useApplicationContext();
  const {content, calling: callingViewModel} = useMainViewModel();
  const {conversation: conversationRepository, calling: callingRepository} = content.repositories;
  const {isCallConnecting, isCallActive} = useMeetingConversationCall(qualifiedConversationId);
  const [isJoining, setIsJoining] = useState(false);

  const guardCall = useNoInternetCallGuard({
    description: translate('callNotEstablishedDescription'),
    descriptionPoints: [
      translate('callNotEstablishedDescriptionPoint1'),
      translate('callNotEstablishedDescriptionPoint2'),
      translate('callNotEstablishedDescriptionPoint3'),
    ],
    title: translate('callNotEstablishedTitle'),
    translate,
  });

  const deps = useMemo<JoinMeetingCallDeps>(
    () => ({
      conversationState: container.resolve(ConversationState),
      conversationRepository,
      callingRepository,
      callingViewModel,
    }),
    [callingRepository, callingViewModel, conversationRepository],
  );

  const showConversationNotFoundModal = useCallback(() => {
    PrimaryModal.show(
      PrimaryModal.type.ACKNOWLEDGE,
      {
        text: {
          message: translate('conversationNotFoundMessage'),
          title: translate('conversationNotFoundTitle', {brandName: Config.getConfig().BRAND_NAME}),
        },
      },
      undefined,
      translate,
    );
  }, [translate]);

  const joinMeeting = useCallback(() => {
    if (isJoining || isCallConnecting || isCallActive) {
      return;
    }

    guardCall(async () => {
      setIsJoining(true);

      const result = await joinMeetingCall(deps, qualifiedConversationId);

      setIsJoining(false);

      if (result.isErr && result.error === joinMeetingCallErrors.conversationNotFound) {
        showConversationNotFoundModal();
      }
    });
  }, [
    deps,
    guardCall,
    isCallActive,
    isCallConnecting,
    isJoining,
    qualifiedConversationId,
    showConversationNotFoundModal,
  ]);

  const isJoinDisabled = isJoining || isCallConnecting || isCallActive;

  return {joinMeeting, isJoinDisabled, isCallActive};
};
