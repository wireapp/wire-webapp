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

import {joinMeetingCall, type JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {mapMeetNowFormToMeetingCommand} from 'Components/Meeting/mapMeetNowFormToMeetingCommand';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {handleJoinMeetingCallResult} from 'Components/Meeting/useJoinMeetingCall';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showCallNotEstablishedModal, useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import {Config} from 'src/script/Config';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {meetNowSubmitResults, type MeetNowFormState, type MeetNowSubmitResult} from './meetNowTypes';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/shared/submit/meetingSubmitErrorKeys';
import {shouldRefreshMeetingsListAfterSubmitError} from 'Components/Meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from 'Components/Meeting/shared/submit/showMeetingPartialAddFailureModal';

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

export const useMeetNowSubmit = (conversationState: ConversationState) => {
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
      conversationState,
      conversationRepository,
      callingRepository,
      callingViewModel,
    }),
    [callingRepository, callingViewModel, conversationRepository, conversationState],
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
    async (qualifiedConversationId: QualifiedId): Promise<MeetNowSubmitResult> => {
      let joinAllowed = false;
      guardCall(() => {
        joinAllowed = true;
      });

      if (!joinAllowed) {
        return meetNowSubmitResults.joinBlocked;
      }

      const result = await joinMeetingCall(joinDeps, qualifiedConversationId);

      if (result.isErr) {
        handleJoinMeetingCallResult(result, {
          showConversationNotFoundModal,
          showJoinFailedModal: () => showCallNotEstablishedModal(callNotEstablishedCopy),
        });
        return meetNowSubmitResults.joinFailed;
      }

      return meetNowSubmitResults.joined;
    },
    [callNotEstablishedCopy, guardCall, joinDeps, showConversationNotFoundModal],
  );

  const submit = useCallback(
    async (formState: MeetNowFormState): Promise<MeetNowSubmitResult> => {
      setIsSubmitting(true);

      const commandResult = mapMeetNowFormToMeetingCommand(formState);

      if (commandResult.isErr) {
        setIsSubmitting(false);
        return meetNowSubmitResults.creationFailed;
      }

      const submitResult = await meetNowMeeting(commandResult.value);

      if (submitResult.isErr) {
        if (shouldRefreshMeetingsListAfterSubmitError(submitResult.error)) {
          await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);
        }

        setIsSubmitting(false);
        showMeetingSubmitError(translate, submitResult.error);
        return meetNowSubmitResults.creationFailed;
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

      const joinResult = await joinCreatedMeeting(qualifiedConversation);

      setIsSubmitting(false);

      return joinResult;
    },
    [joinCreatedMeeting, loadMeetings, meetNowMeeting, translate],
  );

  return {isSubmitting, submit};
};
