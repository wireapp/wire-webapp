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
import userEvent from '@testing-library/user-event';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {Maybe, maybe} from 'true-myth';

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

const renderScheduleMeetingForm = ({
  end = maybe.just(new Date(2026, 8, 24, 14, 0)),
  mode = 'create',
  onEndChange = jest.fn(),
  onStartChange = jest.fn(),
  start = maybe.just(new Date(2026, 8, 24, 13, 0)),
}: {
  end?: Maybe<Date>;
  mode?: 'create' | 'edit';
  onEndChange?: jest.Mock;
  onStartChange?: jest.Mock;
  start?: Maybe<Date>;
}) => {
  const mainViewModel = {
    content: {
      repositories: {
        conversation: {getAllGroupConversations: () => []},
        search: {},
        team: {},
      },
    },
  };
  const wallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: new Date(2026, 8, 24, 12, 49).getTime(),
  });

  render(
    withThemeAndRootContext(
      <ScheduleMeetingForm
        isOpen={false}
        mode={mode}
        formState={{
          title: '',
          start,
          end,
          recurrence: 'doesNotRepeat',
          selectedUsers: [],
          participantsFilter: '',
          password: '',
          passwordConfirmation: '',
        }}
        errors={emptyScheduleMeetingFormErrors()}
        onTitleChange={jest.fn()}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        onRecurrenceChange={jest.fn()}
        onSelectedUsersChange={jest.fn()}
        onParticipantsFilterChange={jest.fn()}
        selfUser={{} as User}
      />,
      createRootProviderWrapperForTest(
        createRootContextValueForTest({
          translate: translateForTest,
          mainViewModel: mainViewModel as unknown as MainViewModel,
          wallClock,
        }),
      ),
    ),
  );
};

describe('ScheduleMeetingForm', () => {
  it('disables browser autocomplete for the meeting title', () => {
    const mainViewModel = {
      content: {
        repositories: {
          conversation: {getAllGroupConversations: () => []},
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
          conversation: {getAllGroupConversations: () => []},
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

  it('rounds a cleared start time up to the next available interval', async () => {
    const user = userEvent.setup();
    const onStartChange = jest.fn();
    const mainViewModel = {
      content: {
        repositories: {
          conversation: {getAllGroupConversations: () => []},
          search: {},
          team: {},
        },
      },
    };
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date(2026, 8, 24, 12, 49).getTime(),
    });

    render(
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
          errors={emptyScheduleMeetingFormErrors()}
          onTitleChange={jest.fn()}
          onStartChange={onStartChange}
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
            wallClock,
          }),
        ),
      ),
    );

    await user.click(screen.getByRole('button', {name: /meetings\.scheduleModal\.openCalendarAriaLabel/}));
    await user.click(screen.getByRole('button', {name: /Thursday, September 24, 2026/}));

    expect(onStartChange).toHaveBeenCalledWith(maybe.just(new Date(2026, 8, 24, 13, 0)));
  });

  it('updates the start time date while preserving its time', async () => {
    const user = userEvent.setup();
    const onStartChange = jest.fn();
    renderScheduleMeetingForm({onStartChange});

    await user.click(screen.getByRole('button', {name: /meetings\.scheduleModal\.openCalendarAriaLabel/}));
    await user.click(screen.getByRole('button', {name: /Friday, September 25, 2026/}));

    expect(onStartChange).toHaveBeenCalledWith(maybe.just(new Date(2026, 8, 25, 13, 0)));
  });

  it('allows selecting a past start time while editing', async () => {
    const user = userEvent.setup();
    const onStartChange = jest.fn();
    renderScheduleMeetingForm({
      mode: 'edit',
      onStartChange,
      start: maybe.just(new Date(2026, 8, 25, 10, 0)),
    });

    await user.click(screen.getByRole('button', {name: /meetings\.scheduleModal\.openCalendarAriaLabel/}));
    await user.click(screen.getByRole('button', {name: /Thursday, September 24, 2026/}));

    expect(onStartChange).toHaveBeenCalledWith(maybe.just(new Date(2026, 8, 24, 10, 0)));
  });

  it('updates the start time while preserving its date', async () => {
    const user = userEvent.setup();
    const onStartChange = jest.fn();
    renderScheduleMeetingForm({onStartChange});

    await user.click(screen.getByRole('combobox', {name: translateForTest('meetings.scheduleModal.startsLabel')}));
    await user.click(screen.getByRole('option', {name: /2:15/}));

    expect(onStartChange).toHaveBeenCalledWith(maybe.just(new Date(2026, 8, 24, 14, 15)));
  });

  it('updates the end time while preserving the start date', async () => {
    const user = userEvent.setup();
    const onEndChange = jest.fn();
    renderScheduleMeetingForm({onEndChange});

    await user.click(screen.getByRole('combobox', {name: translateForTest('meetings.scheduleModal.endsLabel')}));
    await user.click(screen.getByRole('option', {name: /3:15/}));

    expect(onEndChange).toHaveBeenCalledWith(maybe.just(new Date(2026, 8, 24, 15, 15)));
  });
});
