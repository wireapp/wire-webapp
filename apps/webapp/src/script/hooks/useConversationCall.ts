/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useMemo, useState} from 'react';

import {CallState} from 'Repositories/calling/CallState';
import type {Conversation} from 'Repositories/entity/Conversation';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {STATE as CALL_STATE} from '@wireapp/avs';

interface ConversationCallState {
  /** connecting/joining */
  isCallConnecting: boolean;
  /** active/joined */
  isCallActive: boolean;
}

/**
 * Hook to get the call state for a specific conversation
 * @param conversation - The conversation to check for calls
 * @returns Call state information
 */
export const useConversationCall = (conversation: Conversation): ConversationCallState => {
  const callState = container.resolve(CallState);
  const {calls} = useKoSubscribableChildren(callState, ['calls']);

  const call = useMemo(
    () => calls.find(call => matchQualifiedIds(call.conversation.qualifiedId, conversation.qualifiedId)),
    [calls, conversation.qualifiedId],
  );

  const [currentCallState, setCurrentCallState] = useState<CALL_STATE | null>(() => call?.state() ?? null);

  // Subscribe to the call's state changes
  useEffect(() => {
    if (!call) {
      setCurrentCallState(null);
      return () => {};
    }

    setCurrentCallState(call.state());

    // Subscribe to state changes
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
