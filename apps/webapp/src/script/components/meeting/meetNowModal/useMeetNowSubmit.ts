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

import {useMeetingStore} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {useApplicationContext} from 'src/script/page/rootProvider';

import type {MeetNowFormState, MeetNowSubmitResult} from './meetNowTypes';
import {submitMeetNow} from './submitMeetNow';

export const useMeetNowSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {translate, wallClock} = useApplicationContext();
  const meetNowMeeting = useMeetingStore(state => state.meetNowMeeting);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);

  const submit = async (formState: MeetNowFormState): Promise<MeetNowSubmitResult> => {
    setIsSubmitting(true);

    try {
      return await submitMeetNow({
        formState,
        meetNowMeeting,
        loadMeetings,
        translate,
        meetingStartTime: wallClock.currentDate.toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {isSubmitting, submit};
};
