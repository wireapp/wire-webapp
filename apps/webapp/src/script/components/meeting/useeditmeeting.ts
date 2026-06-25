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

import {useCallback} from 'react';

import {container} from 'tsyringe';

import {getScheduleMeetingParticipantPool} from 'Components/meeting/getschedulemeetingparticipantpool';
import {mapMeetingToScheduleFormState} from 'Components/meeting/mapmeetingtoscheduleformstate';
import type {Meeting} from 'Components/meeting/meetinglist/meetinglist';
import {TeamState} from 'Repositories/team/teamstate';
import {UserState} from 'Repositories/user/userstate';

import {useScheduleMeetingModal} from './schedulemeetingmodal/useschedulemeetingmodal';

export const useEditMeeting = () => {
  const openEdit = useScheduleMeetingModal(state => state.openEdit);

  const editMeeting = useCallback(
    (meeting: Meeting) => {
      const userState = container.resolve(UserState);
      const teamState = container.resolve(TeamState);
      const availableUsers = getScheduleMeetingParticipantPool(userState, teamState);
      const formState = mapMeetingToScheduleFormState(meeting, availableUsers);

      openEdit(meeting, formState);
    },
    [openEdit],
  );

  return {editMeeting};
};
