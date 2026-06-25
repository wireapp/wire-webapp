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

import {withThemeAndRootContext} from 'src/script/auth/util/test/testutil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';
import {ConversationState} from 'src/script/repositories/conversation/conversationstate';
import {User} from 'src/script/repositories/entity/user';
import {SearchRepository} from 'src/script/repositories/search/searchrepository';
import {TeamRepository} from 'src/script/repositories/team/teamrepository';
import {TeamState} from 'src/script/repositories/team/teamstate';
import {translateForTest} from 'Util/test/translatefortest';

import {UserSearchableList, UserListProps} from './usersearchablelist';

type UserDefinition = {
  id: string;
  name: string;
  username: string;
};
type MinimalSearchRepository = Pick<SearchRepository, 'normalizeQuery' | 'searchByName' | 'searchUserInSet'>;
type MinimalTeamRepository = Pick<TeamRepository, 'filterExternals' | 'filterRemoteDomainUsers' | 'isSelfConnectedTo'>;
type MinimalTeamState = Pick<TeamState, 'isInTeam'>;
type MinimalConversationState = Pick<ConversationState, 'hasConversationWith'>;

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

describe('UserSearchableList', () => {
  it('updates the visible add participants list when the filter changes', async () => {
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
    const selfUser = createUser({
      id: 'self-id',
      name: 'Self User',
      username: 'selfuser',
    });
    const candidateUsers = [aliceExample, bobTest, charlieExample];
    const searchRepositoryDouble = {
      normalizeQuery: (query: string) => {
        return {query: query.trim().toLowerCase(), isHandleQuery: false};
      },
      searchByName: async () => {
        return [];
      },
      searchUserInSet: (query: string, users: User[]) => {
        return searchUsersByQuery(query, users);
      },
    } satisfies MinimalSearchRepository;
    const teamRepositoryDouble = {
      filterExternals: async (users: User[]) => {
        return users;
      },
      filterRemoteDomainUsers: async (users: User[]) => {
        return users;
      },
      isSelfConnectedTo: () => {
        return false;
      },
    } satisfies MinimalTeamRepository;
    const teamStateDouble = {
      isInTeam: () => {
        return true;
      },
    } satisfies MinimalTeamState;
    const conversationStateDouble = {
      hasConversationWith: () => {
        return true;
      },
    } satisfies MinimalConversationState;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        fireAndForgetInvoker,
        translate: translateForTest,
      }),
    );
    const properties: Omit<UserListProps, 'filter'> = {
      allowRemoteSearch: true,
      conversationState: conversationStateDouble as ConversationState,
      filterRemoteTeamUsers: true,
      isSelectable: true,
      searchRepository: searchRepositoryDouble as SearchRepository,
      selfUser,
      teamRepository: teamRepositoryDouble as TeamRepository,
      teamState: teamStateDouble as TeamState,
      users: candidateUsers,
    };

    const {rerender} = render(
      withThemeAndRootContext(<UserSearchableList {...properties} filter="" />, rootProviderWrapper),
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Example')).toBeInTheDocument();
      expect(screen.getByText('Bob Test')).toBeInTheDocument();
      expect(screen.getByText('Charlie Example')).toBeInTheDocument();
    });

    rerender(withThemeAndRootContext(<UserSearchableList {...properties} filter="test" />, rootProviderWrapper));

    await waitFor(() => {
      expect(screen.getByText('Bob Test')).toBeInTheDocument();
      expect(screen.queryByText('Alice Example')).toBeNull();
      expect(screen.queryByText('Charlie Example')).toBeNull();
    });
  });
});
