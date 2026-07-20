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
import {task, type Task} from 'true-myth';

import {joinMeetingCall, type JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {mapMeetNowFormToMeetingCommand} from 'Components/Meeting/mapMeetNowFormToMeetingCommand';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {MeetNowSubmitSuccess} from 'Components/Meeting/shared/service/meetingService';
import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/shared/submit/meetingSubmitErrorKeys';
import {shouldRefreshMeetingsListAfterSubmitError} from 'Components/Meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from 'Components/Meeting/shared/submit/showMeetingPartialAddFailureModal';
import type {MeetNowMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';
import {handleJoinMeetingCallResult} from 'Components/Meeting/useJoinMeetingCall';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {
  showCallNotEstablishedModal,
  type NoInternetCallGuardCopy,
} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

import {meetNowSubmitResults, type MeetNowFormState, type MeetNowSubmitResult} from './meetNowTypes';

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

const showConversationNotFoundModal = (translate: Translate): void => {
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
};

type JoinCreatedMeetingParams = {
  qualifiedConversationId: QualifiedId;
  joinDeps: JoinMeetingCallDeps;
  guardCall: (startCall: () => void) => void;
  translate: Translate;
  callNotEstablishedCopy: NoInternetCallGuardCopy;
};

const joinCreatedMeeting = async ({
  qualifiedConversationId,
  joinDeps,
  guardCall,
  translate,
  callNotEstablishedCopy,
}: JoinCreatedMeetingParams): Promise<MeetNowSubmitResult> => {
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
      showConversationNotFoundModal: () => showConversationNotFoundModal(translate),
      showJoinFailedModal: () => showCallNotEstablishedModal(callNotEstablishedCopy),
    });
    return meetNowSubmitResults.joinFailed;
  }

  return meetNowSubmitResults.joined;
};

export type SubmitMeetNowParams = {
  formState: MeetNowFormState;
  meetNowMeeting: (command: MeetNowMeetingCommand) => Task<MeetNowSubmitSuccess, MeetingSubmitErrors>;
  loadMeetings: () => Promise<void>;
  joinDeps: JoinMeetingCallDeps;
  guardCall: (startCall: () => void) => void;
  translate: Translate;
  callNotEstablishedCopy: NoInternetCallGuardCopy;
};

export const submitMeetNow = async ({
  formState,
  meetNowMeeting,
  loadMeetings,
  joinDeps,
  guardCall,
  translate,
  callNotEstablishedCopy,
}: SubmitMeetNowParams): Promise<MeetNowSubmitResult> => {
  const commandResult = mapMeetNowFormToMeetingCommand(formState);

  if (commandResult.isErr) {
    return meetNowSubmitResults.creationFailed;
  }

  const submitResult = await meetNowMeeting(commandResult.value);

  if (submitResult.isErr) {
    if (shouldRefreshMeetingsListAfterSubmitError(submitResult.error)) {
      await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);
    }

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

  return joinCreatedMeeting({
    qualifiedConversationId: submitResult.value.qualifiedConversation,
    joinDeps,
    guardCall,
    translate,
    callNotEstablishedCopy,
  });
};
