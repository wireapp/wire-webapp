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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from './scheduleMeetingErrorKeys';
import {performMeetingSubmit} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

import type {MeetingSubmitErrors} from '../MeetingSubmitErrors';

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

export const useScheduleMeetingSubmit = (onMeetingScheduled?: () => Promise<void>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {mainViewModel, translate} = useApplicationContext();
  const meetingsRepository = mainViewModel.content.repositories.meetings;
  const mode = useScheduleMeetingModal(state => state.mode);
  const editingMeetingId = useScheduleMeetingModal(state => state.editingMeetingId);
  const originalInvitedEmails = useScheduleMeetingModal(state => state.originalInvitedEmails);

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
      setIsSubmitting(true);

      try {
        const result = await performMeetingSubmit({
          mode,
          editingMeetingId,
          formState,
          originalInvitedEmails,
          dependencies: {
            meetingsRepository,
            fetchMeetings: () => onMeetingScheduled?.() ?? Promise.resolve(),
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
    [editingMeetingId, meetingsRepository, mode, onMeetingScheduled, originalInvitedEmails, translate],
  );

  return {isSubmitting, submit};
};
