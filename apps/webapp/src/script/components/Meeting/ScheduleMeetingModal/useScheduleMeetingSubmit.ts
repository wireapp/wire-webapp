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

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from './scheduleMeetingErrorKeys';
import {tryScheduleMeeting} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

export const useScheduleMeetingSubmit = (onMeetingScheduled?: () => Promise<void>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {mainViewModel, translate} = useApplicationContext();
  const meetingsRepository = mainViewModel.content.repositories.meetings;

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
      setIsSubmitting(true);

      try {
        const result = await tryScheduleMeeting(formState, {
          meetingsRepository,
          fetchMeetings: () => onMeetingScheduled?.() ?? Promise.resolve(),
        });

        if (result.status !== 'success') {
          const {titleKey, messageKey} = SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS[result.status];
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
          return false;
        }

        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [meetingsRepository, onMeetingScheduled, translate],
  );

  return {isSubmitting, submit};
};
