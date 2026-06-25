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
import userEvent from '@testing-library/user-event';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import ko from 'knockout';

import {withThemeAndRootContext} from 'src/script/auth/util/test/testutil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';
import {ConversationRepository} from 'src/script/repositories/conversation/conversationrepository';
import {Conversation} from 'src/script/repositories/entity/conversation';
import {User} from 'src/script/repositories/entity/user';
import {IntegrationRepository} from 'src/script/repositories/integration/integrationrepository';
import {ServiceEntity} from 'src/script/repositories/integration/serviceentity';
import {SearchRepository} from 'src/script/repositories/search/searchrepository';
import {TeamRepository} from 'src/script/repositories/team/teamrepository';
import {TeamState} from 'src/script/repositories/team/teamstate';
import {UserState} from 'src/script/repositories/user/userstate';
import {translateForTest} from 'Util/test/translatefortest';

import {AddParticipants} from './addparticipants';

type UserDefinition = {
  id: string;
  name: string;
  username: string;
};
type MinimalConversationRepository = Pick<ConversationRepository, 'addUsers'>;
type MinimalIntegrationRepository = Pick<
  IntegrationRepository,
  'mapServiceFromUser' | 'searchForServices' | 'services'
>;
type MinimalSearchRepository = Pick<SearchRepository, 'normalizeQuery' | 'searchByName' | 'searchUserInSet'>;
type MinimalTeamRepository = Pick<TeamRepository, 'filterExternals' | 'filterRemoteDomainUsers' | 'isSelfConnectedTo'>;
type MinimalTeamState = Pick<TeamState, 'isAppsEnabled' | 'isInTeam' | 'isTeam' | 'teamMembers' | 'teamUsers'>;
type MinimalUserState = Pick<UserState, 'connectedUsers'>;

function createUser(userDefinition: UserDefinition): User {
  const {id, name, username} = userDefinition;
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  user.username(username);
  user.teamId = 'team-id';

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

function createActiveConversation(): Conversation {
  const activeConversation = new Conversation(
    'conversation-id',
    'example.com',
    CONVERSATION_PROTOCOL.PROTEUS,
    translateForTest,
  );
  activeConversation.teamId = 'team-id';

  Object.defineProperties(activeConversation, {
    firstUserEntity: {
      value: ko.pureComputed(() => {
        return undefined;
      }),
    },
    inTeam: {
      value: ko.pureComputed(() => {
        return true;
      }),
    },
    isGroupOrChannel: {
      value: ko.pureComputed(() => {
        return true;
      }),
    },
    isGuestAndServicesRoom: {
      value: ko.pureComputed(() => {
        return false;
      }),
    },
    isServicesRoom: {
      value: ko.pureComputed(() => {
        return false;
      }),
    },
    isTeamOnly: {
      value: ko.pureComputed(() => {
        return false;
      }),
    },
  });

  return activeConversation;
}

function createTeamState(candidateUsers: User[]): MinimalTeamState {
  return {
    isAppsEnabled: ko.pureComputed(() => {
      return false;
    }),
    isInTeam: () => {
      return true;
    },
    isTeam: ko.pureComputed(() => {
      return true;
    }),
    teamMembers: ko.pureComputed(() => {
      return candidateUsers;
    }),
    teamUsers: ko.pureComputed(() => {
      return candidateUsers;
    }),
  };
}

describe('AddParticipants', () => {
  it('keeps the search input stable and filters visible users while typing', async () => {
    const user = userEvent.setup();
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
    const conversationRepositoryDouble = {
      addUsers: async () => {
        return undefined;
      },
    } satisfies MinimalConversationRepository;
    const integrationRepositoryDouble = {
      mapServiceFromUser: () => {
        return undefined as unknown as ServiceEntity;
      },
      searchForServices: async () => {
        return undefined;
      },
      services: ko.observableArray<ServiceEntity>([]),
    } satisfies MinimalIntegrationRepository;
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
        return true;
      },
    } satisfies MinimalTeamRepository;
    const teamStateDouble = createTeamState(candidateUsers);
    const userStateDouble = {
      connectedUsers: ko.pureComputed(() => {
        return candidateUsers;
      }),
    } satisfies MinimalUserState;
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
        translate: translateForTest,
      }),
    );

    render(
      withThemeAndRootContext(
        <AddParticipants
          activeConversation={createActiveConversation()}
          conversationRepository={conversationRepositoryDouble as ConversationRepository}
          integrationRepository={integrationRepositoryDouble as IntegrationRepository}
          onBack={jest.fn()}
          onClose={jest.fn()}
          searchRepository={searchRepositoryDouble as SearchRepository}
          selfUser={selfUser}
          teamRepository={teamRepositoryDouble as TeamRepository}
          teamState={teamStateDouble as TeamState}
          togglePanel={jest.fn()}
          userState={userStateDouble as UserState}
        />,
        rootProviderWrapper,
      ),
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Example')).toBeInTheDocument();
      expect(screen.getByText('Bob Test')).toBeInTheDocument();
      expect(screen.getByText('Charlie Example')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', {name: 'addParticipantsSearchPlaceholder'});
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(searchInput).toHaveValue('test');
      expect(screen.getByText('Bob Test')).toBeInTheDocument();
      expect(screen.queryByText('Alice Example')).toBeNull();
      expect(screen.queryByText('Charlie Example')).toBeNull();
    });
  });
});
