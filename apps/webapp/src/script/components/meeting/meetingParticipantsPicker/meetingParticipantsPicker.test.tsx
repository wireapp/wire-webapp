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
import type {SearchRepository} from 'Repositories/search/searchRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import type {TeamState} from 'Repositories/team/TeamState';
import type {ConversationState} from 'src/script/repositories/conversation/ConversationState';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {formatParticipantsFieldLabel} from './formatParticipantsFieldLabel';
import {MeetingParticipantsPicker} from './meetingParticipantsPicker';
import {searchUsersByQuery} from './participantPickerUtils';

setStrings({en});

const SEARCH_PLACEHOLDER = 'Search by name';

const createUser = (id: string, name: string, handle: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  user.username(handle);
  return user;
};

const users = [
  createUser('1', 'Thomas Goodwin', 'thomas'),
  createUser('2', 'Alice Anderson', 'alice'),
  createUser('3', 'Bob Baker', 'bob'),
];

const searchRepositoryDouble = {
  normalizeQuery: (query: string) => {
    return {query: query.trim().toLowerCase(), isHandleQuery: false};
  },
  searchByName: async () => {
    return [];
  },
  searchUserInSet: (query: string, candidateUsers: User[]) => {
    return searchUsersByQuery(candidateUsers, query);
  },
} satisfies Pick<SearchRepository, 'normalizeQuery' | 'searchByName' | 'searchUserInSet'>;

const teamRepositoryDouble = {
  filterExternals: async (candidateUsers: User[]) => {
    return candidateUsers;
  },
  filterRemoteDomainUsers: async (candidateUsers: User[]) => {
    return candidateUsers;
  },
  isSelfConnectedTo: () => {
    return false;
  },
} satisfies Pick<TeamRepository, 'filterExternals' | 'filterRemoteDomainUsers' | 'isSelfConnectedTo'>;

const teamStateDouble = {
  isInTeam: () => {
    return true;
  },
} satisfies Pick<TeamState, 'isInTeam'>;

const conversationStateDouble = {
  hasConversationWith: () => {
    return false;
  },
} satisfies Pick<ConversationState, 'hasConversationWith'>;

const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    fireAndForgetInvoker,
    translate,
  }),
);

const ControlledPicker = ({
  initialSelected = [],
  initialFilter = '',
  searchByName = searchRepositoryDouble.searchByName,
  availableUsers = users,
}: {
  initialSelected?: User[];
  initialFilter?: string;
  searchByName?: (query: string, teamId?: string) => Promise<User[]>;
  availableUsers?: User[];
}) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(initialSelected);
  const [filter, setFilter] = useState(initialFilter);
  const selfUser = availableUsers[0] ?? users[0];

  return (
    <MeetingParticipantsPicker
      id="meeting-participants-picker"
      dataUieName="meeting-participants-picker"
      label="Participants"
      placeholder={SEARCH_PLACEHOLDER}
      users={availableUsers}
      selectedUsers={selectedUsers}
      onSelectedUsersChange={setSelectedUsers}
      filter={filter}
      onFilterChange={setFilter}
      selfUser={selfUser}
      searchRepository={{...searchRepositoryDouble, searchByName}}
      teamRepository={teamRepositoryDouble}
      conversationState={conversationStateDouble}
      teamState={teamStateDouble}
    />
  );
};

const getSearchInput = () => screen.getByLabelText(SEARCH_PLACEHOLDER);

describe('MeetingParticipantsPicker', () => {
  it('renders label and search input', () => {
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(getSearchInput()).toBeInTheDocument();
  });

  it('shows selected count on the label', () => {
    const selected = users.slice(0, 2);

    render(withThemeAndRootContext(<ControlledPicker initialSelected={selected} />, rootProviderWrapper));

    expect(screen.getByText('Participants (2 selected)')).toBeInTheDocument();
    expect(screen.queryByTestId('meeting-participants-picker-summary')).not.toBeInTheDocument();
  });

  it('keeps the search input empty of selected names', () => {
    render(withThemeAndRootContext(<ControlledPicker initialSelected={users.slice(0, 3)} />, rootProviderWrapper));

    const input = getSearchInput();

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', SEARCH_PLACEHOLDER);
    expect(input).toBeEnabled();
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
  });

  it('opens the menu and filters users locally', async () => {
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    fireEvent.change(getSearchInput(), {target: {value: 'alice'}});

    await waitFor(() => {
      expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
      expect(screen.queryByText('Thomas Goodwin')).not.toBeInTheDocument();
    });
  });

  it('shows team members without requiring an existing conversation', async () => {
    const user = userEvent.setup();
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    await user.click(getSearchInput());

    await waitFor(() => {
      expect(screen.getByText('Thomas Goodwin')).toBeInTheDocument();
      expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
      expect(screen.getByText('Bob Baker')).toBeInTheDocument();
    });
  });

  it('shows all provided users when there are more than the truncated default', async () => {
    const manyUsers = Array.from({length: 8}, (_, index) =>
      createUser(`user-${index}`, `User ${index}`, `user${index}`),
    );
    const user = userEvent.setup();

    render(withThemeAndRootContext(<ControlledPicker availableUsers={manyUsers} />, rootProviderWrapper));

    await user.click(getSearchInput());

    await waitFor(() => {
      expect(screen.getByText('User 0')).toBeInTheDocument();
      expect(screen.getByText('User 7')).toBeInTheDocument();
    });
  });

  it('allows typing in the search input to filter users', async () => {
    const user = userEvent.setup();
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    const input = getSearchInput();
    await user.click(input);
    await user.type(input, 'bob');

    expect(input).toHaveValue('bob');

    await waitFor(() => {
      expect(screen.getByText('Bob Baker')).toBeInTheDocument();
      expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
    });
  });

  it('selects a participant from the list', async () => {
    const user = userEvent.setup();
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    const input = getSearchInput();
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice Anderson'));

    expect(screen.getByText('Participants (1 selected)')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', SEARCH_PLACEHOLDER);
    expect(screen.queryByTestId('meeting-participants-picker-summary')).not.toBeInTheDocument();
  });

  it('clears the search filter after selecting a participant', async () => {
    const user = userEvent.setup();
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    const input = getSearchInput();
    await user.click(input);
    await user.type(input, 'alice');

    expect(input).toHaveValue('alice');

    await waitFor(() => {
      expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice Anderson'));

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', SEARCH_PLACEHOLDER);
    expect(screen.getByText('Participants (1 selected)')).toBeInTheDocument();
  });

  it('includes remote team search results when filtering', async () => {
    const remoteUser = createUser('remote-1', 'Remote Member', 'remote');
    remoteUser.teamId = users[0].teamId;

    render(
      withThemeAndRootContext(
        <ControlledPicker
          searchByName={async () => {
            return [remoteUser];
          }}
        />,
        rootProviderWrapper,
      ),
    );

    fireEvent.change(getSearchInput(), {target: {value: 'remote'}});

    await waitFor(() => {
      expect(screen.getByText('Remote Member')).toBeInTheDocument();
    });
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      withThemeAndRootContext(
        <div>
          <ControlledPicker />
          <button type="button">Outside</button>
        </div>,
        rootProviderWrapper,
      ),
    );

    const input = getSearchInput();
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
      withThemeAndRootContext(
        <div>
          <ControlledPicker />
          <button type="button">Outside</button>
        </div>,
        rootProviderWrapper,
      ),
    );

    const input = getSearchInput();
    await user.click(input);
    await user.type(input, 'alice');

    expect(input).toHaveValue('alice');

    await user.click(screen.getByRole('button', {name: 'Outside'}));

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-meeting-participants-picker')).not.toBeInTheDocument();
      expect(input).toHaveValue('');
    });
  });

  it('keeps search available after selecting multiple participants', async () => {
    const user = userEvent.setup();
    render(
      withThemeAndRootContext(<ControlledPicker initialSelected={users.slice(0, 2)} />, rootProviderWrapper),
    );

    const input = getSearchInput();

    expect(screen.getByText('Participants (2 selected)')).toBeInTheDocument();
    expect(input).toBeEnabled();

    await user.click(input);
    await user.type(input, 'bob');

    expect(input).toHaveValue('bob');

    await waitFor(() => {
      expect(screen.getByText('Bob Baker')).toBeInTheDocument();
    });
  });
});

describe('formatParticipantsFieldLabel', () => {
  it('returns the base label when no participants are selected', () => {
    expect(formatParticipantsFieldLabel('Participants', 0, translate)).toBe('Participants');
  });

  it('appends the selected count to the label', () => {
    expect(formatParticipantsFieldLabel('Participants', 2, translate)).toBe('Participants (2 selected)');
  });
});

describe('participantPickerUtils', () => {
  it('searchUsersByQuery filters by name and handle', () => {
    expect(searchUsersByQuery(users, 'alice')).toEqual([users[1]]);
    expect(searchUsersByQuery(users, 'bob')).toEqual([users[2]]);
    expect(searchUsersByQuery(users, '')).toEqual(users);
  });
});
