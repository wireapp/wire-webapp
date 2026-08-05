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

import {render, screen} from '@testing-library/react';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {MeetingAction} from './meetingAction';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

jest.mock('Components/Meeting/useEditMeeting', () => ({
  useEditMeeting: () => ({editMeeting: jest.fn()}),
}));
jest.mock('Components/Meeting/useDeleteMeeting', () => ({
  useDeleteMeeting: () => ({openDeleteMeetingModal: jest.fn()}),
}));

const start = new Date('2026-06-15T14:00:00.000Z');
const end = new Date('2026-06-15T15:00:00.000Z');
const series: MeetingSeries = {
  series_start_date: start.toISOString(),
  series_end_date: end.toISOString(),
  duration_ms: end.getTime() - start.getTime(),
  recurrence: 'doesNotRepeat',
  conversation_id: 'conversation-id',
  title: 'Meeting',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
};
const meetingInstance: MeetingInstance = {meetingSeries: series, start, end};
const selfUser = new User('host-id', 'example.com', translateForTest);

const renderAction = (now: string, user = selfUser) =>
  render(
    <ThemeProvider>
      <MeetingAction meetingInstance={meetingInstance} selfUser={user} />
    </ThemeProvider>,
    {
      wrapper: createRootProviderWrapperForTest(
        createRootContextValueForTest({
          translate: translateForTest,
          wallClock: createDeterministicWallClock({initialCurrentTimestampInMilliseconds: Date.parse(now)}),
        }),
      ),
    },
  );

describe('MeetingAction', () => {
  it.each([
    ['upcoming', '2026-06-15T13:00:00.000Z'],
    ['ongoing', '2026-06-15T14:30:00.000Z'],
    ['ongoing at the scheduled end', '2026-06-15T15:00:00.000Z'],
  ])('renders the action button for %s meetings for the host', (_status, now) => {
    renderAction(now);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it.each([
    ['upcoming', '2026-06-15T13:00:00.000Z'],
    ['ongoing', '2026-06-15T14:30:00.000Z'],
  ])('renders the action button for %s meetings for an invitee', (_status, now) => {
    renderAction(now, new User('invitee-id', 'example.com', translateForTest));

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it.each(['2026-06-15T15:00:00.001Z', '2026-06-15T16:00:00.000Z'])(
    'hides the action button after the meeting ends at %s for the host',
    now => {
      renderAction(now);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );

  it('hides the action button after the meeting ends for an invitee', () => {
    renderAction('2026-06-15T16:00:00.000Z', new User('invitee-id', 'example.com', translateForTest));

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
