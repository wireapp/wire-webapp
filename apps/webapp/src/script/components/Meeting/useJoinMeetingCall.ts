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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

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
  const {calls} = useKoSubscribableChildren(callState, ['calls']);

  const call = useMemo(
    () => calls.find(callInstance => matchQualifiedIds(callInstance.conversation.qualifiedId, qualifiedConversationId)),
    [calls, qualifiedConversationId],
  );

  const [currentCallState, setCurrentCallState] = useState<CALL_STATE | null>(() => call?.state() ?? null);

  useEffect(() => {
    if (!call) {
      setCurrentCallState(null);
      return () => {};
    }

    setCurrentCallState(call.state());

    const subscription = call.state.subscribe(newState => {
      setCurrentCallState(newState);
    });

    return () => {
      subscription.dispose();
    };
  }, [call]);

  return {
    isCallConnecting: currentCallState === CALL_STATE.ANSWERED,
    isCallActive: currentCallState === CALL_STATE.MEDIA_ESTAB,
  };
};

export const useJoinMeetingCall = (qualifiedConversationId: QualifiedId) => {
  const {translate} = useApplicationContext();
  const {content, calling: callingViewModel} = useMainViewModel();
  const {conversation: conversationRepository, calling: callingRepository} = content.repositories;
  const {isCallConnecting, isCallActive} = useMeetingConversationCall(qualifiedConversationId);
  const isJoiningCallRef = useRef(false);

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
    if (isJoiningCallRef.current || isCallConnecting || isCallActive) {
      return;
    }

    isJoiningCallRef.current = true;

    guardCall(async () => {
      const result = await joinMeetingCall(deps, qualifiedConversationId);

      if (result.isErr && result.error === joinMeetingCallErrors.conversationNotFound) {
        showConversationNotFoundModal();
      }

      isJoiningCallRef.current = false;
    });
  }, [deps, guardCall, isCallActive, isCallConnecting, qualifiedConversationId, showConversationNotFoundModal]);

  const isJoinDisabled = isJoiningCallRef.current || isCallConnecting || isCallActive;

  return {joinMeeting, isJoinDisabled, isCallActive};
};
