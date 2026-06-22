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

import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import type {MeetingsListRefresher, ScheduleMeetingNotifier} from './scheduleMeetingService.types';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

export class ScheduleMeetingService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly meetingsListRefresher: MeetingsListRefresher,
    private readonly notifier: ScheduleMeetingNotifier,
  ) {}

  /**
   * Tries to schedule a meeting with the given form state.
   * If the meeting cannot be scheduled because of a missing participant email, it will show an error notification and return false.
   * If the meeting cannot be scheduled because of an error, it will show an error notification and return false.
   * @param formState - The form state to schedule the meeting with.
   * @returns True if the meeting was scheduled successfully, false otherwise.
   */
  async tryScheduleMeeting(formState: ScheduleMeetingFormState): Promise<boolean> {
    const mapping = mapScheduleFormToCreateMeeting(formState);

    if (mapping.error === 'participantMissingEmail') {
      this.notifier.showParticipantMissingEmailError();
      return false;
    }

    try {
      await this.meetingsRepository.createMeeting(mapping.payload);
      await this.meetingsListRefresher.fetchMeetings();
      return true;
    } catch {
      this.notifier.showCreateError();
      return false;
    }
  }
}
