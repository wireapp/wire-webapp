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

import {useCallback, useState} from 'react';

import {isStringMeetingSubmitError, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from './scheduleMeetingErrorKeys';
import {performMeetingSubmit} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

const PAIR_OF_NAMES = 2;

const formatParticipantNames = (names: string[], translate: Translate): string => {
  if (names.length === PAIR_OF_NAMES) {
    return `${names[0]} ${translate('and')} ${names[1]}`;
  }

  const lastName = names[names.length - 1];
  const otherNames = names.slice(0, -1).join(', ');

  return `${otherNames}${translate('enumerationAnd')}${lastName}`;
};

const showMeetingSubmitError = (translate: Translate, error: MeetingSubmitErrors): void => {
  if (isStringMeetingSubmitError(error)) {
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
    return;
  }

  const messageKey =
    error.userNames.length === 1
      ? 'meetings.scheduleModal.error.participantMissingEmailSingular'
      : 'meetings.scheduleModal.error.participantMissingEmailPlural';

  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        title: translate('meetings.scheduleModal.error.createFailedTitle'),
        message:
          error.userNames.length === 1
            ? translate(messageKey, {name: error.userNames[0]})
            : translate(messageKey, {names: formatParticipantNames(error.userNames, translate)}),
      },
    },
    undefined,
    translate,
  );
};

export const useScheduleMeetingSubmit = (onMeetingScheduled?: () => Promise<void>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {mainViewModel, translate, wallClock} = useApplicationContext();
  const meetingsRepository = mainViewModel.content.repositories.meetings;
  const mode = useScheduleMeetingModal(state => state.mode);
  const editingMeetingId = useScheduleMeetingModal(state => state.editingMeetingId);
  const originalInvitedParticipantEmails = useScheduleMeetingModal(state => state.originalInvitedParticipantEmails);

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
      setIsSubmitting(true);

      try {
        const result = await performMeetingSubmit({
          mode,
          editingMeetingId,
          formState,
          originalInvitedParticipantEmails,
          dependencies: {
            meetingsRepository,
            fetchMeetings: () => onMeetingScheduled?.() ?? Promise.resolve(),
            wallClock,
          },
        });

        if (result.isErr) {
          showMeetingSubmitError(translate, result.error);
          return false;
        }

        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      editingMeetingId,
      meetingsRepository,
      mode,
      onMeetingScheduled,
      originalInvitedParticipantEmails,
      translate,
      wallClock,
    ],
  );

  return {isSubmitting, submit};
};
