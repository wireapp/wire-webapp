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

import {task, type Task} from 'true-myth';

import {mapMeetNowFormToMeetingCommand} from 'Components/meeting/mapMeetNowFormToMeetingCommand';
import {useMeetingPrepModal} from 'Components/meeting/meetingPrep/useMeetingPrepModal';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/meeting/meetingSubmitErrors';
import type {CreateMeetingSuccess} from 'Components/meeting/shared/service/meetingService';
import {MEET_NOW_ERROR_TRANSLATION_KEYS} from 'Components/meeting/shared/submit/meetingSubmitErrorKeys';
import {
  isMeetingPersistedDespiteSubmitError,
  shouldRefreshMeetingsListAfterSubmitError,
} from 'Components/meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from 'Components/meeting/shared/submit/showMeetingPartialAddFailureModal';
import {showMeetingSubmitError} from 'Components/meeting/shared/submit/showMeetingSubmitError';
import type {MeetNowMeetingCommand} from 'Components/meeting/shared/types/meetingCommandTypes';
import type {Translate} from 'Util/localizerUtil';

import {meetNowSubmitResults, type MeetNowFormState, type MeetNowSubmitResult} from './meetNowTypes';

export type SubmitMeetNowParams = {
  formState: MeetNowFormState;
  meetNowMeeting: (command: MeetNowMeetingCommand) => Task<CreateMeetingSuccess, MeetingSubmitErrors>;
  loadMeetings: () => Promise<void>;
  translate: Translate;
  meetingStartTime: string;
};

export const submitMeetNow = async ({
  formState,
  meetNowMeeting,
  loadMeetings,
  translate,
  meetingStartTime,
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

    showMeetingSubmitError(translate, submitResult.error, MEET_NOW_ERROR_TRANSLATION_KEYS);

    return isMeetingPersistedDespiteSubmitError(submitResult.error)
      ? meetNowSubmitResults.setupFailed
      : meetNowSubmitResults.creationFailed;
  }

  if (submitResult.value.failedToAdd.length > 0) {
    showMeetingPartialAddFailureModal({
      failedToAdd: submitResult.value.failedToAdd,
      users: formState.selectedUsers,
      translate,
    });
  }

  useMeetingPrepModal.getState().open({
    meetingTitle: commandResult.value.title,
    meetingStartTime,
    qualifiedMeetingId: submitResult.value.qualifiedMeetingId,
    qualifiedConversationId: submitResult.value.qualifiedConversation,
  });

  return meetNowSubmitResults.prepOpened;
};
