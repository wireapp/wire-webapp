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

import {render, screen, waitFor} from '@testing-library/react';
import ko from 'knockout';

import {withThemeAndRootContext} from 'src/script/auth/util/test/TestUtil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {ConversationState} from 'src/script/repositories/conversation/ConversationState';
import {User} from 'src/script/repositories/entity/User';
import {SearchRepository} from 'src/script/repositories/search/searchRepository';
import {TeamRepository} from 'src/script/repositories/team/TeamRepository';
import {TeamState} from 'src/script/repositories/team/TeamState';
import {UserState} from 'src/script/repositories/user/userState';
import {translateForTest} from 'Util/test/translateForTest';

import {PeopleTab, PeopleTabProps, SearchResultsData} from './PeopleTab';

type UserDefinition = {
  id: string;
  name: string;
  username: string;
};
type MinimalSearchRepository = Pick<SearchRepository, 'normalizeQuery' | 'searchUserInSet'>;
type MinimalTeamRepository = Pick<TeamRepository, 'isSelfConnectedTo'>;
type MinimalConversationRepository = Pick<PeopleTabProps['conversationRepository'], never>;
type MinimalUserRepository = Pick<PeopleTabProps['userRepository'], never>;

function createUser(userDefinition: UserDefinition): User {
  const {id, name, username} = userDefinition;
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  user.username(username);

  return user;
}

function searchUsersByQuery(query: string, users: User[]): User[] {
  const normalizedQuery = query.trim().toLowerCase();

  return users.filter(user => {
    return (
      user.name().toLowerCase().includes(normalizedQuery) || user.username().toLowerCase().includes(normalizedQuery)
    );
  });
}

function createConversationState(localUsers: User[], teamState: TeamState): ConversationState {
  const conversationState = new ConversationState(new UserState(), teamState);

  Object.defineProperty(conversationState, 'connectedUsers', {
    value: ko.pureComputed(() => {
      return localUsers;
    }),
  });
  conversationState.hasConversationWith = () => {
    return true;
  };

  return conversationState;
}

function createTeamState(): TeamState {
  const teamState = new TeamState(new UserState());

  Object.defineProperty(teamState, 'teamSize', {
    value: ko.pureComputed(() => {
      return 3;
    }),
  });
  teamState.isInTeam = () => {
    return true;
  };

  return teamState;
}

describe('PeopleTab', () => {
  it('updates the visible people list when the search query changes', async () => {
    const aliceExample = createUser({
      id: 'alice-id',
      name: 'Alice Example',
      username: 'aliceexample',
    });
    const bobTest = createUser({
      id: 'bob-id',
      name: 'Bob Test',
      username: 'bobtest',
    });
    const charlieExample = createUser({
      id: 'charlie-id',
      name: 'Charlie Example',
      username: 'charlieexample',
    });
    const localUsers = [aliceExample, bobTest, charlieExample];
    const selfUser = createUser({
      id: 'self-id',
      name: 'Self User',
      username: 'selfuser',
    });
    const teamState = createTeamState();
    const conversationState = createConversationState(localUsers, teamState);
    const searchRepositoryDouble = {
      normalizeQuery: (query: string) => {
        return {query: query.trim().toLowerCase(), isHandleQuery: false};
      },
      searchUserInSet: (query: string, users: User[]) => {
        return searchUsersByQuery(query, users);
      },
    } satisfies MinimalSearchRepository;
    const teamRepositoryDouble = {
      isSelfConnectedTo: () => {
        return false;
      },
    } satisfies MinimalTeamRepository;
    const conversationRepositoryDouble = {} satisfies MinimalConversationRepository;
    const userRepositoryDouble = {} satisfies MinimalUserRepository;
    const onSearchResults = jest.fn<void, [SearchResultsData | undefined]>();
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        fireAndForgetInvoker,
        translate: translateForTest,
      }),
    );

    const properties: PeopleTabProps = {
      canInviteTeamMembers: false,
      canSearchUnconnectedUsers: false,
      conversationRepository: conversationRepositoryDouble as PeopleTabProps['conversationRepository'],
      conversationState,
      isFederated: false,
      isTeam: true,
      onClickContact: jest.fn(),
      onClickUser: jest.fn(),
      onSearchResults,
      searchRepository: searchRepositoryDouble as PeopleTabProps['searchRepository'],
      selfUser,
      teamRepository: teamRepositoryDouble as PeopleTabProps['teamRepository'],
      teamState,
      userRepository: userRepositoryDouble as PeopleTabProps['userRepository'],
      userState: new UserState(),
    };

    const {rerender} = render(
      withThemeAndRootContext(<PeopleTab {...properties} searchQuery="" />, rootProviderWrapper),
    );

    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('Bob Test')).toBeInTheDocument();
    expect(screen.getByText('Charlie Example')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSearchResults).toHaveBeenCalledWith(undefined);
    });

    onSearchResults.mockClear();

    rerender(withThemeAndRootContext(<PeopleTab {...properties} searchQuery="test" />, rootProviderWrapper));

    await waitFor(() => {
      expect(screen.queryByText('Alice Example')).toBeNull();
      expect(screen.queryByText('Charlie Example')).toBeNull();
    });

    expect(screen.getByText('Bob Test')).toBeInTheDocument();
  });
});
