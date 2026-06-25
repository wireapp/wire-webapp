/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {CellsRepository} from 'Repositories/cells/cellsrepository';
import {ConnectionRepository} from 'Repositories/connection/connectionrepository';
import {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import {ConversationRoleRepository} from 'Repositories/conversation/conversationrolerepository';
import {MessageRepository} from 'Repositories/conversation/messagerepository';
import {Conversation} from 'Repositories/entity/conversation';
import {User} from 'Repositories/entity/user';
import {IntegrationRepository} from 'Repositories/integration/integrationrepository';
import {SearchRepository} from 'Repositories/search/searchrepository';
import {SelfRepository} from 'Repositories/self/selfrepository';
import {TeamEntity} from 'Repositories/team/teamentity';
import {TeamRepository} from 'Repositories/team/teamrepository';
import {TeamState} from 'Repositories/team/teamstate';
import {UserState} from 'Repositories/user/userstate';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';
import {translate} from 'Util/localizerUtil';
import 'src/script/util/test/mock/localstoragemock';
import {createUuid} from 'Util/uuid';

import {ConversationDetails} from './conversationdetails';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {ActionsViewModel} from '../../../viewModel/actionsviewmodel';
import {MainViewModel} from '../../../viewModel/mainviewmodel';
import {translateForTest} from 'Util/test/translatefortest';

jest.mock('Components/panel/enrichedfields', () => ({
  useEnrichedFields: (): never[] => [],
  EnrichedFields: () => <div />,
  __esModule: true,
}));
jest.mock('Components/panel/userdetails', () => ({
  UserDetails: () => <div />,
  __esModule: true,
}));

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;
let searchRepository: SearchRepository;
const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

beforeAll(async () => {
  conversationRepository = await testFactory.exposeConversationActors();
  searchRepository = await testFactory.exposeSearchActors();
});

const getDefaultParams = () => {
  const conversationRoleRepository: Partial<ConversationRoleRepository> = {
    canAddParticipants: () => true,
    canDeleteGroup: () => true,
    canLeaveGroup: () => true,
    canRenameGroup: () => true,
    canToggleTimeout: () => true,
    canToggleGuests: () => true,
    canToggleReadReceipts: () => true,
    isUserGroupAdmin: () => true,
  };

  const selfUserMock = new User(createUuid(), '', translateForTest);

  return {
    actionsViewModel: new ActionsViewModel(
      {} as SelfRepository,
      {} as CellsRepository,
      {} as ConnectionRepository,
      conversationRepository,
      {} as IntegrationRepository,
      {} as MessageRepository,
      {} as UserState,
      {} as TeamState,
      {} as MainViewModel,
      translate,
    ),
    conversationRepository: {
      expectReadReceipt: () => true,
      getNextConversation: () =>
        Promise.resolve(new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest)),
      refreshUnavailableParticipants: () => Promise.resolve(),
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
    } as unknown as ConversationRepository,
    integrationRepository: {getServiceFromUser: (): null => null} as unknown as IntegrationRepository,
    isFederated: false,
    isVisible: true,
    searchRepository,
    teamRepository: {
      getRoleBadge: (userId: string) => '',
      updateTeamMembersByIds: (teamEntity: TeamEntity, memberIds?: string[], append?: boolean) => Promise.resolve(),
      isSelfConnectedTo: () => true,
    } as unknown as TeamRepository,
    teamState: new TeamState(),
    selfUser: selfUserMock,
  };
};

describe('ConversationDetails', () => {
  it("returns the right actions depending on the conversation's type for non group creators", () => {
    const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const otherUser = new User('other-user', '', translateForTest);
    jest.spyOn(otherUser as any, 'isConnected').mockReturnValue(true);
    jest.spyOn(conversation as any, 'isClearable').mockReturnValue(true);
    conversation.participating_user_ets([otherUser]);

    const defaultProps = getDefaultParams();

    const {rerender, getByTestId} = render(
      <ConversationDetails {...defaultProps} activeConversation={conversation} />,
      {
        wrapper: rootProviderWrapper,
      },
    );

    const tests = [
      {
        conversationType: CONVERSATION_TYPE.ONE_TO_ONE,
        expected: ['go-create-group', 'do-archive', 'do-clear', 'do-block'],
        permission: {canCreateGroupConversation: () => true},
      },
      {
        conversationType: CONVERSATION_TYPE.ONE_TO_ONE,
        expected: ['do-archive', 'do-clear', 'do-block'],
        permission: {canCreateGroupConversation: () => false},
      },
      {
        conversationType: CONVERSATION_TYPE.REGULAR,
        expected: ['do-archive', 'do-clear', 'do-leave'],
        permission: {canCreateGroupConversation: () => true},
      },
      {
        conversationType: CONVERSATION_TYPE.CONNECT,
        expected: ['do-archive', 'do-cancel-request', 'do-block'],
        permission: {canCreateGroupConversation: () => true},
      },
    ];

    return tests.forEach(({expected, permission, conversationType}) => {
      act(() => {
        conversation.type(conversationType);
      });

      rerender(<ConversationDetails {...defaultProps} activeConversation={conversation} />);

      expected.forEach(action => {
        const actionItem = getByTestId(action);
        expect(actionItem).not.toBeNull();
      });
    });
  });
});
