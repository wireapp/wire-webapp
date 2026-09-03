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

import {User} from 'Repositories/entity/User';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
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
import {translateForTest} from 'Util/test/translateForTest';
import {meetingsM2FeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';

import {formatParticipantsFieldLabel} from './formatParticipantsFieldLabel';
import {MeetingParticipantsPicker} from './meetingParticipantsPicker';
import {mergeUsersIntoSelection, searchUsersByQuery} from './participantPickerUtils';

const SEARCH_PLACEHOLDER = 'meetings.scheduleModal.participantsPlaceholder';
const PARTICIPANTS_LABEL = 'Participants';
const PARTICIPANTS_LABEL_WITH_COUNT = 'meetings.scheduleModal.participantsLabelWithCount';
const GROUPS_AND_CHANNELS_LABEL = 'meetings.scheduleModal.groupsAndChannels';
const CONTACTS_LABEL = 'userListContacts';
const SELECTED_CONTACTS_LABEL = 'userListSelectedContacts';
const NO_MATCHES_LABEL = 'searchListNoMatches';

const createUser = (id: string, name: string, handle: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  user.username(handle);
  return user;
};

const createConversation = (
  id: string,
  name: string,
  members: User[],
  channel = false,
  {removed = false, archived = false, cleared = false}: {removed?: boolean; archived?: boolean; cleared?: boolean} = {},
) =>
  ({
    display_name: () => name,
    isSelfUserRemoved: () => removed,
    is_archived: () => archived,
    is_cleared: () => cleared,
    isChannel: () => channel,
    participating_user_ets: () => members,
    qualifiedId: {domain: 'example.com', id},
  }) as unknown as Conversation;

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
let meetingsM2EnabledForTest = true;

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    fireAndForgetInvoker,
    isFeatureToggleEnabled: featureName => featureName === meetingsM2FeatureToggleName && meetingsM2EnabledForTest,
    translate: translateForTest,
  }),
);

const ControlledPicker = ({
  initialSelected = [],
  initialFilter = '',
  searchByName = searchRepositoryDouble.searchByName,
  availableUsers = users,
  label = PARTICIPANTS_LABEL,
  conversationRepository,
}: {
  initialSelected?: User[];
  initialFilter?: string;
  searchByName?: (query: string, teamId?: string) => Promise<User[]>;
  availableUsers?: User[];
  label?: string;
  conversationRepository?: Pick<ConversationRepository, 'getAllGroupConversations'>;
}) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(initialSelected);
  const [filter, setFilter] = useState(initialFilter);
  const selfUser = availableUsers[0] ?? users[0];

  return (
    <MeetingParticipantsPicker
      id="meeting-participants-picker"
      dataUieName="meeting-participants-picker"
      label={label}
      users={availableUsers}
      selectedUsers={selectedUsers}
      onSelectedUsersChange={setSelectedUsers}
      filter={filter}
      onFilterChange={setFilter}
      selfUser={selfUser}
      searchRepository={{...searchRepositoryDouble, searchByName}}
      teamRepository={teamRepositoryDouble}
      conversationRepository={conversationRepository as ConversationRepository | undefined}
      conversationState={conversationStateDouble}
      teamState={teamStateDouble}
    />
  );
};

const getSearchInput = (accessibleName = PARTICIPANTS_LABEL) => screen.getByRole('combobox', {name: accessibleName});

const setMeetingsM2Enabled = (enabled: boolean) => {
  meetingsM2EnabledForTest = enabled;
};

describe('MeetingParticipantsPicker', () => {
  beforeEach(() => setMeetingsM2Enabled(true));

  afterEach(() => setMeetingsM2Enabled(false));

  it('renders label and search input', () => {
    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    expect(screen.getByText(PARTICIPANTS_LABEL)).toBeInTheDocument();
    expect(getSearchInput()).toBeInTheDocument();
    expect(getSearchInput()).toHaveAttribute('placeholder', SEARCH_PLACEHOLDER);
  });

  it('shows selected count on the label', () => {
    const selected = users.slice(0, 2);

    render(withThemeAndRootContext(<ControlledPicker initialSelected={selected} />, rootProviderWrapper));

    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: PARTICIPANTS_LABEL_WITH_COUNT})).toBeInTheDocument();
    expect(screen.queryByRole('combobox', {name: SEARCH_PLACEHOLDER})).not.toBeInTheDocument();
    expect(screen.queryByTestId('meeting-participants-picker-summary')).not.toBeInTheDocument();
  });

  it('keeps search available after selecting more than three participants', async () => {
    const carol = createUser('4', 'Carol Chen', 'carol');
    const availableUsers = [...users, carol];
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker availableUsers={availableUsers} initialSelected={availableUsers.slice(0, 3)} />,
        rootProviderWrapper,
      ),
    );

    const input = getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT);

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', SEARCH_PLACEHOLDER);
    expect(input).toBeEnabled();
    expect(screen.queryByText('Carol Chen')).not.toBeInTheDocument();

    await user.click(input);
    await user.type(input, 'carol');

    expect(input).toHaveValue('carol');

    await waitFor(() => {
      expect(screen.getByText('Carol Chen')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Carol Chen'));

    expect(screen.getByRole('combobox', {name: PARTICIPANTS_LABEL_WITH_COUNT})).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: PARTICIPANTS_LABEL_WITH_COUNT})).toHaveValue('');
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

  it('shows local groups and channels below contacts and filters them with the same input', async () => {
    const group = createConversation('group', 'Engineering', [users[0]]);
    const channel = createConversation('channel', 'Announcements', [users[1]], true);
    const getAllGroupConversations = jest.fn(() => [group, channel]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());
    expect(screen.getByText(CONTACTS_LABEL)).toBeInTheDocument();
    expect(screen.getByText(GROUPS_AND_CHANNELS_LABEL)).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Announcements').parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Engineering').parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(getAllGroupConversations).toHaveBeenCalled();

    await user.type(getSearchInput(), 'announce');
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Thomas Goodwin')).not.toBeInTheDocument();
  });

  it('does not show removed, archived, or cleared conversations as participant sources', async () => {
    const active = createConversation('active', 'Active group', [users[0]]);
    const removed = createConversation('removed', 'Removed group', [users[0]], false, {removed: true});
    const archived = createConversation('archived', 'Archived group', [users[0]], false, {archived: true});
    const cleared = createConversation('cleared', 'Cleared group', [users[0]], false, {cleared: true});
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker
          conversationRepository={{getAllGroupConversations: () => [active, removed, archived, cleared]}}
        />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());

    expect(screen.getByText('Active group')).toBeInTheDocument();
    expect(screen.queryByText('Removed group')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived group')).not.toBeInTheDocument();
    expect(screen.queryByText('Cleared group')).not.toBeInTheDocument();
  });

  it('does not query or render groups and channels when meetings M2 is disabled', async () => {
    setMeetingsM2Enabled(false);
    const getAllGroupConversations = jest.fn(() => [createConversation('group', 'Engineering', [users[0]])]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());

    expect(screen.queryByText(GROUPS_AND_CHANNELS_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(getAllGroupConversations).not.toHaveBeenCalled();
  });

  it('keeps contact searching available when meetings M2 is disabled', async () => {
    setMeetingsM2Enabled(false);
    const user = userEvent.setup();

    render(withThemeAndRootContext(<ControlledPicker />, rootProviderWrapper));

    await user.click(getSearchInput());
    await user.type(getSearchInput(), 'alice');

    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    expect(screen.queryByText(GROUPS_AND_CHANNELS_LABEL)).not.toBeInTheDocument();
  });

  it('allows groups and channels to be collapsed until the search input is focused again', async () => {
    const conversation = createConversation('group', 'Engineering', [users[0]]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    const input = getSearchInput();
    await user.click(input);

    expect(screen.getByText('Engineering')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: GROUPS_AND_CHANNELS_LABEL}));
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();

    await user.click(input);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('opens groups and channels when the picker is opened with the chevron or by typing', async () => {
    const conversation = createConversation('group', 'Engineering', [users[0]]);
    const user = userEvent.setup();

    const {unmount} = render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(screen.getByRole('button', {name: PARTICIPANTS_LABEL}));
    expect(screen.getByText('Engineering')).toBeInTheDocument();

    unmount();
    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    fireEvent.change(getSearchInput(), {target: {value: 'eng'}});
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('imports all conversation members additively and keeps the dropdown open', async () => {
    const selected = users[0];
    const guest = createUser('guest', 'Guest User', 'guest');
    const conversation = createConversation('group', 'Project', [selected, guest]);
    const user = userEvent.setup();
    const getAllGroupConversations = jest.fn(() => [conversation]);

    render(
      withThemeAndRootContext(
        <ControlledPicker initialSelected={[selected]} conversationRepository={{getAllGroupConversations}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT));
    await user.click(screen.getByText('Project'));

    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
    expect(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT)).toHaveValue('');
  });

  it('removes only users unique to an unselected conversation', async () => {
    const shared = createUser('shared', 'Shared User', 'shared');
    const onlyInFirst = createUser('first', 'First User', 'first');
    const first = createConversation('first', 'First group', [shared, onlyInFirst]);
    const second = createConversation('second', 'Second group', [shared]);
    const user = userEvent.setup();
    const getAllGroupConversations = jest.fn(() => [first, second]);

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());
    await user.click(screen.getByText('First group'));
    await user.click(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT));
    await user.click(screen.getByText('Second group'));
    await user.click(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT));
    await user.click(screen.getByRole('checkbox', {name: /First group/}));

    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
  });

  it('preserves manually selected users when a conversation is deselected', async () => {
    const manual = users[0];
    const imported = users[1];
    const conversation = createConversation('group', 'Engineering', [imported]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker
          initialSelected={[manual]}
          conversationRepository={{getAllGroupConversations: () => [conversation]}}
        />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT));
    await user.click(screen.getByText('Engineering'));
    await user.click(screen.getByText('Engineering'));

    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
    await user.click(screen.getByText(SELECTED_CONTACTS_LABEL));
    expect(screen.getByText('Thomas Goodwin')).toBeInTheDocument();
  });

  it('hides the groups and channels section when there are no matches', async () => {
    const conversation = createConversation('group', 'Engineering', [users[0]]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());
    await user.type(getSearchInput(), 'missing');

    expect(screen.queryByText(GROUPS_AND_CHANNELS_LABEL)).not.toBeInTheDocument();
    expect(getSearchInput()).toBeEnabled();
    expect(screen.getByText(NO_MATCHES_LABEL)).toBeInTheDocument();
  });

  it('hides the no matching results message when a group or channel still matches', async () => {
    const conversation = createConversation('group', 'Test WPB-21813', [users[0]]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());
    await user.type(getSearchInput(), 'test');

    expect(screen.getByText('Test WPB-21813')).toBeInTheDocument();
    expect(screen.queryByText(NO_MATCHES_LABEL)).not.toBeInTheDocument();
  });

  it('keeps already-selected participants visible when the search text no longer matches them', async () => {
    const guest = createUser('guest', 'Guest User', 'guest');
    const conversation = createConversation('group', 'Test channel', [guest]);
    const user = userEvent.setup();

    render(
      withThemeAndRootContext(
        <ControlledPicker conversationRepository={{getAllGroupConversations: () => [conversation]}} />,
        rootProviderWrapper,
      ),
    );

    await user.click(getSearchInput());
    await user.click(screen.getByText('Test channel'));

    await user.click(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT));
    await user.type(getSearchInput(PARTICIPANTS_LABEL_WITH_COUNT), 'test');

    expect(screen.getByText(SELECTED_CONTACTS_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(NO_MATCHES_LABEL)).not.toBeInTheDocument();

    await user.click(screen.getByText(SELECTED_CONTACTS_LABEL));

    expect(screen.getByText('Guest User')).toBeInTheDocument();
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

    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
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
    expect(screen.getByText(PARTICIPANTS_LABEL_WITH_COUNT)).toBeInTheDocument();
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
});

describe('formatParticipantsFieldLabel', () => {
  it('returns the base label when no participants are selected', () => {
    expect(formatParticipantsFieldLabel('Participants', 0, translateForTest)).toBe('Participants');
  });

  it('appends the selected count to the label', () => {
    expect(formatParticipantsFieldLabel('Participants', 2, translateForTest)).toBe(PARTICIPANTS_LABEL_WITH_COUNT);
  });
});

describe('participantPickerUtils', () => {
  it('searchUsersByQuery filters by name and handle', () => {
    expect(searchUsersByQuery(users, 'alice')).toEqual([users[1]]);
    expect(searchUsersByQuery(users, 'bob')).toEqual([users[2]]);
    expect(searchUsersByQuery(users, '')).toEqual(users);
  });

  it('merges imported users with the existing selection without duplicating qualified ids', () => {
    const selectedUser = createUser('1', 'Thomas Goodwin', 'thomas');
    const importedGuest = createUser('guest', 'Guest User', 'guest');
    const duplicateWithSameId = createUser('1', 'Updated Thomas', 'thomas-updated');

    expect(mergeUsersIntoSelection([selectedUser], [duplicateWithSameId, importedGuest])).toEqual([
      selectedUser,
      importedGuest,
    ]);
  });
});
