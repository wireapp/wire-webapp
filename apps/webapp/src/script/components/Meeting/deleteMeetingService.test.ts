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

import {MeetingsRepository} from 'Repositories/meetings';
import {task} from 'true-myth';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {deleteMeetingErrors} from './DeleteMeetingErrors';
import {tryDeleteMeeting} from './deleteMeetingService';

const meetingId = {id: 'meeting-id', domain: 'example.com'};

describe('tryDeleteMeeting', () => {
  const createDeps = ({
    deleteMeeting = jest.fn().mockReturnValue(task.resolve(undefined)),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    deleteMeeting?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      deleteMeeting,
    } as unknown as MeetingsRepository;

    return {
      deps: {meetingsRepository, fetchMeetings},
      deleteMeeting,
      fetchMeetings,
    };
  };

  it('deletes a meeting and refreshes the list', async () => {
    const {deps, deleteMeeting, fetchMeetings} = createDeps();

    const result = await tryDeleteMeeting({meetingId, dependencies: deps});

    expect(result.isOk).toBe(true);
    expect(deleteMeeting).toHaveBeenCalledWith(meetingId);
    expect(fetchMeetings).toHaveBeenCalledTimes(1);
  });

  it('returns deleteFailed when deleteMeeting fails', async () => {
    const {deps} = createDeps({
      deleteMeeting: jest.fn().mockReturnValue(task.reject(new Error('delete failed'))),
    });

    const result = await tryDeleteMeeting({meetingId, dependencies: deps});

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(deleteMeetingErrors.deleteFailed);
  });
});
