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

import {Result} from 'true-myth';

import type {MeetNowFormErrors, MeetNowFormState} from 'Components/Meeting/meetNowModal/meetNowTypes';
import {validateMeetNowForm} from 'Components/Meeting/meetNowModal/useMeetNowModal';
import type {MeetNowMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';

export const mapMeetNowFormToMeetingCommand = (
  formState: MeetNowFormState,
): Result<MeetNowMeetingCommand, MeetNowFormErrors> =>
  validateMeetNowForm(formState).map(validatedFormState => ({
    title: validatedFormState.title.trim(),
    selectedUsers: validatedFormState.selectedUsers,
  }));
