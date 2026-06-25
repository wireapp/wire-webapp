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

import {useCallback, useEffect, useState} from 'react';

import {loadMeetingsList, type MeetingsListErrorKey} from 'Components/meeting/loadMeetingsList';
import type {Meeting} from 'Components/meeting/meetingList/meetingList';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const useMeetingsList = () => {
  const {fireAndForgetInvoker, mainViewModel} = useApplicationContext();
  const meetingsRepository = mainViewModel.content.repositories.meetings;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<MeetingsListErrorKey | undefined>();

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(undefined);

    const result = await loadMeetingsList(meetingsRepository);

    setMeetings(result.meetings);
    setErrorKey(result.errorKey);
    setIsLoading(false);
  }, [meetingsRepository]);

  useEffect(() => {
    fireAndForgetInvoker.fireAndForget(fetchMeetings);
  }, [fetchMeetings, fireAndForgetInvoker]);

  return {meetings, isLoading, errorKey, fetchMeetings};
};
