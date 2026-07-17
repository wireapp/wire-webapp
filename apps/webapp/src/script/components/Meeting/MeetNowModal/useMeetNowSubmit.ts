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

import {useCallback, useMemo, useState} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task} from 'true-myth';
import {container} from 'tsyringe';

import {joinMeetingCall, type JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {handleJoinMeetingCallResult} from 'Components/Meeting/useJoinMeetingCall';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showCallNotEstablishedModal, useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Config} from 'src/script/Config';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import type {MeetNowFormState} from './meetNowTypes';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from '../ScheduleMeetingModal/scheduleMeetingErrorKeys';
import {shouldRefreshMeetingsListAfterSubmitError} from '../ScheduleMeetingModal/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from '../ScheduleMeetingModal/showMeetingPartialAddFailureModal';

const showMeetingSubmitError = (translate: Translate, error: MeetingSubmitErrors): void => {
  const {titleKey, messageKey} = SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS[error];
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        title: translate(titleKey),
        message: translate(messageKey),
      },
    },
    undefined,
    translate,
  );
};

export const useMeetNowSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {translate} = useApplicationContext();
  const {content, calling: callingViewModel} = useMainViewModel();
  const {conversation: conversationRepository, calling: callingRepository} = content.repositories;
  const meetNowMeeting = useMeetingStore(state => state.meetNowMeeting);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);

  const callNotEstablishedCopy = useMemo(
    () => ({
      description: translate('callNotEstablishedDescription'),
      descriptionPoints: [
        translate('callNotEstablishedDescriptionPoint1'),
        translate('callNotEstablishedDescriptionPoint2'),
        translate('callNotEstablishedDescriptionPoint3'),
      ] as [string, string, string],
      title: translate('callNotEstablishedTitle'),
      translate,
    }),
    [translate],
  );

  const guardCall = useNoInternetCallGuard(callNotEstablishedCopy);

  const joinDeps = useMemo<JoinMeetingCallDeps>(
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

  const joinCreatedMeeting = useCallback(
    (qualifiedConversationId: QualifiedId) => {
      guardCall(async () => {
        const result = await joinMeetingCall(joinDeps, qualifiedConversationId);

        if (result.isErr) {
          handleJoinMeetingCallResult(result, {
            showConversationNotFoundModal,
            showJoinFailedModal: () => showCallNotEstablishedModal(callNotEstablishedCopy),
          });
        }
      });
    },
    [callNotEstablishedCopy, guardCall, joinDeps, showConversationNotFoundModal],
  );

  const submit = useCallback(
    async (formState: MeetNowFormState): Promise<boolean> => {
      setIsSubmitting(true);

      const submitResult = await meetNowMeeting(formState);

      if (submitResult.isErr) {
        if (shouldRefreshMeetingsListAfterSubmitError(submitResult.error)) {
          await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);
        }

        setIsSubmitting(false);
        showMeetingSubmitError(translate, submitResult.error);
        return false;
      }

      if (submitResult.value.failedToAdd.length > 0) {
        showMeetingPartialAddFailureModal({
          failedToAdd: submitResult.value.failedToAdd,
          users: formState.selectedUsers,
          translate,
        });
      }

      await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);

      const {qualifiedConversation} = submitResult.value;

      setIsSubmitting(false);
      joinCreatedMeeting(qualifiedConversation);

      return true;
    },
    [joinCreatedMeeting, loadMeetings, meetNowMeeting, translate],
  );

  return {isSubmitting, submit};
};
