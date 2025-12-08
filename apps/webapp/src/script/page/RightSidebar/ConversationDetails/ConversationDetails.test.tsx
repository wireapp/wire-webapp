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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationRoleRepository} from 'Repositories/conversation/ConversationRoleRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {TeamEntity} from 'Repositories/team/TeamEntity';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import 'src/script/util/test/mock/LocalStorageMock';
import {createUuid} from 'Util/uuid';

import {ConversationDetails} from './ConversationDetails';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {MainViewModel} from '../../../view_model/MainViewModel';

jest.mock('Components/panel/EnrichedFields', () => ({
  useEnrichedFields: () => [],
  EnrichedFields: () => <div />,
  __esModule: true,
}));
jest.mock('Components/panel/UserDetails', () => ({
  UserDetails: () => <div />,
  __esModule: true,
}));

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;
let searchRepository: SearchRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });

  testFactory.exposeSearchActors().then(factory => {
    searchRepository = factory;
    return searchRepository;
  });
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

  const selfUserMock = new User(createUuid());

  return {
    actionsViewModel: new ActionsViewModel(
      {} as SelfRepository,
      {} as CellsRepository,
      {} as ConnectionRepository,
      conversationRepository,
      {} as IntegrationRepository,
      {} as MessageRepository,
      {} as UserState,
      {} as MainViewModel,
    ),
    conversationRepository: {
      expectReadReceipt: () => true,
      getNextConversation: () => Promise.resolve(new Conversation()),
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
    const conversation = new Conversation();
    const otherUser = new User('other-user');
    jest.spyOn(otherUser as any, 'isConnected').mockReturnValue(true);
    jest.spyOn(conversation as any, 'isClearable').mockReturnValue(true);
    conversation.participating_user_ets([otherUser]);

    const defaultProps = getDefaultParams();

    const {rerender, getByTestId} = render(<ConversationDetails {...defaultProps} activeConversation={conversation} />);

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
