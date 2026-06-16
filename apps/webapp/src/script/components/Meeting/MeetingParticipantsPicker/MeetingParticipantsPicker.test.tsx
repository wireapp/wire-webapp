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

import {useState} from 'react';

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import en from 'I18n/en-US.json';
import {User} from 'Repositories/entity/User';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {setStrings, t} from 'Util/localizerUtil';

import {MeetingParticipantsPicker} from './MeetingParticipantsPicker';
import {formatSelectedSummary} from './formatSelectedSummary';

setStrings({en});

const createUser = (id: string, name: string, handle: string) => {
  const user = new User(id, 'example.com');
  user.name(name);
  user.username(handle);
  return user;
};

const users = [
  createUser('1', 'Thomas Goodwin', 'thomas'),
  createUser('2', 'Alice Anderson', 'alice'),
  createUser('3', 'Bob Baker', 'bob'),
];

const ControlledPicker = ({
  initialSelected = [],
  initialFilter = '',
}: {
  initialSelected?: User[];
  initialFilter?: string;
}) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(initialSelected);
  const [filter, setFilter] = useState(initialFilter);

  return (
    <MeetingParticipantsPicker
      id="meeting-participants-picker"
      dataUieName="meeting-participants-picker"
      label="Participants"
      users={users}
      selectedUsers={selectedUsers}
      onSelectedUsersChange={setSelectedUsers}
      filter={filter}
      onFilterChange={setFilter}
      selfUser={users[0]}
    />
  );
};

describe('MeetingParticipantsPicker', () => {
  it('renders label and search input', () => {
    render(withTheme(<ControlledPicker />));

    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter a name')).toBeInTheDocument();
  });

  it('shows truncated selected summary', () => {
    const selected = users.slice(0, 3);

    render(withTheme(<ControlledPicker initialSelected={selected} />));

    expect(screen.getByTestId('meeting-participants-picker-summary')).toHaveTextContent(
      formatSelectedSummary(selected),
    );
  });

  it('opens the menu and filters users locally', () => {
    render(withTheme(<ControlledPicker />));

    fireEvent.change(screen.getByLabelText('Enter a name'), {target: {value: 'alice'}});

    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    expect(screen.queryByText('Thomas Goodwin')).not.toBeInTheDocument();
  });

  it('allows typing in the search input to filter users', async () => {
    const user = userEvent.setup();
    render(withTheme(<ControlledPicker />));

    const input = screen.getByLabelText('Enter a name');
    await user.click(input);
    await user.type(input, 'bob');

    expect(input).toHaveValue('bob');
    expect(screen.getByText('Bob Baker')).toBeInTheDocument();
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      withTheme(
        <div>
          <ControlledPicker />
          <button type="button">Outside</button>
        </div>,
      ),
    );

    const input = screen.getByLabelText('Enter a name');
    await user.click(input);

    expect(screen.getByTestId('dropdown-meeting-participants-picker')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Outside'}));

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-meeting-participants-picker')).not.toBeInTheDocument();
    });
  });

  it('clears the search filter when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      withTheme(
        <div>
          <ControlledPicker />
          <button type="button">Outside</button>
        </div>,
      ),
    );

    const input = screen.getByLabelText('Enter a name');
    await user.click(input);
    await user.type(input, 'alice');

    expect(input).toHaveValue('alice');

    await user.click(screen.getByRole('button', {name: 'Outside'}));

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-meeting-participants-picker')).not.toBeInTheDocument();
      expect(input).toHaveValue('');
    });
  });
});

describe('formatSelectedSummary', () => {
  it('formats multiple selections with overflow count', () => {
    const selected = users.concat(createUser('4', 'Carol Chen', 'carol'), createUser('5', 'David Davis', 'david'));

    expect(formatSelectedSummary(selected)).toBe(
      t('meetings.scheduleModal.participantsSelectedSummaryOverflow', {
        name1: 'Thomas Goodwin',
        name2: 'Alice Anderson',
        initial: 'B',
        count: 3,
      }),
    );
  });
});
