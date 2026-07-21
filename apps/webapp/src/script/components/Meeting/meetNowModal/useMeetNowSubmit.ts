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

import {useState} from 'react';

import type {JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';

import type {MeetNowFormState, MeetNowSubmitResult} from './meetNowTypes';
import {submitMeetNow} from './submitMeetNow';

export const useMeetNowSubmit = (conversationState: ConversationState) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {translate} = useApplicationContext();
  const {content, calling: callingViewModel} = useMainViewModel();
  const {conversation: conversationRepository, calling: callingRepository} = content.repositories;
  const meetNowMeeting = useMeetingStore(state => state.meetNowMeeting);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);

  const callNotEstablishedCopy = {
    description: translate('callNotEstablishedDescription'),
    descriptionPoints: [
      translate('callNotEstablishedDescriptionPoint1'),
      translate('callNotEstablishedDescriptionPoint2'),
      translate('callNotEstablishedDescriptionPoint3'),
    ] as [string, string, string],
    title: translate('callNotEstablishedTitle'),
    translate,
  };

  const guardCall = useNoInternetCallGuard(callNotEstablishedCopy);

  const joinDeps: JoinMeetingCallDeps = {
    conversationState,
    conversationRepository,
    callingRepository,
    callingViewModel,
  };

  const submit = async (formState: MeetNowFormState): Promise<MeetNowSubmitResult> => {
    setIsSubmitting(true);

    try {
      return await submitMeetNow({
        formState,
        meetNowMeeting,
        loadMeetings,
        joinDeps,
        guardCall,
        translate,
        callNotEstablishedCopy,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {isSubmitting, submit};
};
