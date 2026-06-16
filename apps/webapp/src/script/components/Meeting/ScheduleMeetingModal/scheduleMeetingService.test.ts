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

import {User} from 'Repositories/entity/User';

import {ScheduleMeetingService} from './scheduleMeetingService';
import type {MeetingsListRefresher, ScheduleMeetingNotifier} from './scheduleMeetingService.types';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';
import {MeetingsRepository} from 'Repositories/meetings';

const formState: ScheduleMeetingFormState = {
  title: 'Weekly sync',
  start: new Date('2026-06-15T10:00:00.000Z'),
  end: new Date('2026-06-15T11:00:00.000Z'),
  recurrence: 'doesNotRepeat',
  selectedUsers: [],
  participantsFilter: '',
};

describe('ScheduleMeetingService', () => {
  const createService = ({
    createMeeting = jest.fn().mockResolvedValue({}),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
    showCreateError = jest.fn(),
    showParticipantMissingEmailError = jest.fn(),
  }: {
    createMeeting?: jest.Mock;
    fetchMeetings?: jest.Mock;
    showCreateError?: jest.Mock;
    showParticipantMissingEmailError?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      createMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;
    const meetingsListRefresher: MeetingsListRefresher = {fetchMeetings};
    const notifier: ScheduleMeetingNotifier = {
      showCreateError,
      showParticipantMissingEmailError,
    };

    return {
      service: new ScheduleMeetingService(meetingsRepository, meetingsListRefresher, notifier),
      createMeeting,
      fetchMeetings,
      showCreateError,
      showParticipantMissingEmailError,
    };
  };

  it('creates a meeting and refreshes the list', async () => {
    const {service, createMeeting, fetchMeetings} = createService();

    await expect(service.scheduleMeeting(formState)).resolves.toBe(true);

    expect(createMeeting).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
    });
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('shows participant missing email error and does not call API', async () => {
    const user = new User('1', 'example.com');
    user.name('Alice');
    const {service, createMeeting, showParticipantMissingEmailError} = createService();

    await expect(
      service.scheduleMeeting({
        ...formState,
        selectedUsers: [user],
      }),
    ).resolves.toBe(false);

    expect(showParticipantMissingEmailError).toHaveBeenCalled();
    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('shows create error when API fails', async () => {
    const {service, showCreateError, fetchMeetings} = createService({
      createMeeting: jest.fn().mockRejectedValue(new Error('network')),
    });

    await expect(service.scheduleMeeting(formState)).resolves.toBe(false);

    expect(showCreateError).toHaveBeenCalled();
    expect(fetchMeetings).not.toHaveBeenCalled();
  });
});
