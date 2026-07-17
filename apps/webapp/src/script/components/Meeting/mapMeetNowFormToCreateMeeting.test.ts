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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {mapMeetNowFormToCreateMeeting} from './mapMeetNowFormToCreateMeeting';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

describe('mapMeetNowFormToCreateMeeting', () => {
  it('maps title and immediate start/end times', () => {
    const result = mapMeetNowFormToCreateMeeting(
      {
        title: '  Standup  ',
        selectedUsers: [],
        participantsFilter: '',
      },
      wallClock,
    );

    expect(result).toEqual({
      title: 'Standup',
      start_time: fixedNow.toISOString(),
      end_time: new Date(fixedNow.getTime() + 60 * 60 * 1000).toISOString(),
    });
  });
});
