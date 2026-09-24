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
import {maybe} from 'true-myth';

import type {User} from 'Repositories/entity/User';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {ScheduleMeetingForm} from './scheduleMeetingForm';
import {emptyScheduleMeetingFormErrors} from './scheduleMeetingTypes';

describe('ScheduleMeetingForm', () => {
  it('disables browser autocomplete for the meeting title', () => {
    const mainViewModel = {
      content: {
        repositories: {
          conversation: {},
          search: {},
          team: {},
        },
      },
    };

    const {rerender} = render(
      withThemeAndRootContext(
        <ScheduleMeetingForm
          isOpen={false}
          mode="create"
          formState={{
            title: '',
            start: maybe.nothing(),
            end: maybe.nothing(),
            recurrence: 'doesNotRepeat',
            selectedUsers: [],
            participantsFilter: '',
            password: '',
            passwordConfirmation: '',
          }}
          errors={{...emptyScheduleMeetingFormErrors(), title: undefined}}
          onTitleChange={jest.fn()}
          onStartChange={jest.fn()}
          onEndChange={jest.fn()}
          onRecurrenceChange={jest.fn()}
          onSelectedUsersChange={jest.fn()}
          onParticipantsFilterChange={jest.fn()}
          selfUser={{} as User}
        />,
        createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            mainViewModel: mainViewModel as unknown as MainViewModel,
          }),
        ),
      ),
    );

    expect(screen.getByTestId('schedule-meeting-title')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByTestId('schedule-meeting-date')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {name: translateForTest('meetings.scheduleModal.startsLabel')}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {name: translateForTest('meetings.scheduleModal.endsLabel')}),
    ).toBeInTheDocument();

    const titleInput = screen.getByTestId('schedule-meeting-title');
    rerender(
      withThemeAndRootContext(
        <ScheduleMeetingForm
          isOpen
          mode="create"
          formState={{
            title: '',
            start: maybe.nothing(),
            end: maybe.nothing(),
            recurrence: 'doesNotRepeat',
            selectedUsers: [],
            participantsFilter: '',
            password: '',
            passwordConfirmation: '',
          }}
          errors={{...emptyScheduleMeetingFormErrors(), title: undefined}}
          onTitleChange={jest.fn()}
          onStartChange={jest.fn()}
          onEndChange={jest.fn()}
          onRecurrenceChange={jest.fn()}
          onSelectedUsersChange={jest.fn()}
          onParticipantsFilterChange={jest.fn()}
          selfUser={{} as User}
        />,
        createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            mainViewModel: mainViewModel as unknown as MainViewModel,
          }),
        ),
      ),
    );

    expect(titleInput).toHaveFocus();
  });

  it('renders the end-time validation error next to the end-time field', () => {
    const mainViewModel = {
      content: {
        repositories: {
          conversation: {},
          search: {},
          team: {},
        },
      },
    };

    render(
      withThemeAndRootContext(
        <ScheduleMeetingForm
          isOpen={false}
          mode="create"
          formState={{
            title: '',
            start: maybe.just(new Date(2026, 5, 16, 15, 0)),
            end: maybe.just(new Date(2026, 5, 16, 14, 0)),
            recurrence: 'doesNotRepeat',
            selectedUsers: [],
            participantsFilter: '',
            password: '',
            passwordConfirmation: '',
          }}
          errors={{
            ...emptyScheduleMeetingFormErrors(),
            endBeforeStart: translateForTest('meetings.scheduleModal.error.endBeforeStart'),
          }}
          onTitleChange={jest.fn()}
          onStartChange={jest.fn()}
          onEndChange={jest.fn()}
          onRecurrenceChange={jest.fn()}
          onSelectedUsersChange={jest.fn()}
          onParticipantsFilterChange={jest.fn()}
          selfUser={{} as User}
        />,
        createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            mainViewModel: mainViewModel as unknown as MainViewModel,
          }),
        ),
      ),
    );

    expect(screen.getByTestId('schedule-meeting-end-time-error')).toHaveTextContent(
      'meetings.scheduleModal.error.endBeforeStart',
    );
  });
});
