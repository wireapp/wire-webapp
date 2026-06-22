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

import {useApplicationContext} from 'src/script/page/rootProvider';

import {ScheduleMeetingNotifierImpl} from './scheduleMeetingNotifier';
import {ScheduleMeetingService} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

export const useScheduleMeetingSubmit = (onMeetingScheduled?: () => Promise<void>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {mainViewModel} = useApplicationContext();
  const meetingsRepository = mainViewModel.content.repositories.meetings;

  const scheduleMeetingService = useMemo(() => {
    return new ScheduleMeetingService(
      meetingsRepository,
      {fetchMeetings: () => onMeetingScheduled?.() ?? Promise.resolve()},
      new ScheduleMeetingNotifierImpl(),
    );
  }, [meetingsRepository, onMeetingScheduled]);

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
      setIsSubmitting(true);

      try {
        return await scheduleMeetingService.scheduleMeeting(formState);
      } finally {
        setIsSubmitting(false);
      }
    },
    [scheduleMeetingService],
  );

  return {isSubmitting, submit};
};
