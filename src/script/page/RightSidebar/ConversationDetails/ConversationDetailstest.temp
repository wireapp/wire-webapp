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

import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation/';
import {render} from '@testing-library/react';
import ko from 'knockout';

import {Conversation} from 'src/script/entity/Conversation';
import ConversationDetails from './ConversationDetails';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {TestFactory} from '../../../../../test/helper/TestFactory';
import {SearchRepository} from '../../../search/SearchRepository';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelViewModel} from '../../../view_model/PanelViewModel';
import {ConversationRoleRepository} from '../../../conversation/ConversationRoleRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {UserState} from '../../../user/UserState';
import {t} from 'Util/LocalizerUtil';
import {User} from '../../../entity/User';
import {TeamEntity} from '../../../team/TeamEntity';

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
  };

  return {
    actionsViewModel: {
      archiveConversation: async (activeConversation: Conversation) => Promise.resolve(),
      blockUser: async (userEntity: User, hideConversation?: boolean, nextConversationEntity?: Conversation) =>
        Promise.resolve(),
      cancelConnectionRequest: (userEntity: User, hideConversation?: boolean, nextConversationEntity?: Conversation) =>
        Promise.resolve(),
      clearConversation: (activeConversation: Conversation) => {},
      deleteConversation: async (activeConversation: Conversation) => Promise.resolve(),
      leaveConversation: async (activeConversation: Conversation) => Promise.resolve(),
      toggleMuteConversation: (conversationEntity: Conversation) => {},
    } as ActionsViewModel,
    conversationRepository: {
      expectReadReceipt: (conversationEntity: Conversation) => true,
    } as ConversationRepository,
    integrationRepository: {} as IntegrationRepository,
    isFederated: false,
    isVisible: true,
    panelViewModel: createPanelViewModel(),
    roleRepository: conversationRoleRepository as ConversationRoleRepository,
    searchRepository,
    teamRepository: {
      getRoleBadge: (userId: string) => '',
      updateTeamMembersByIds: (teamEntity: TeamEntity, memberIds?: string[], append?: boolean) => Promise.resolve(),
    } as TeamRepository,
    teamState: new TeamState(),
    userState: new UserState(),
  };
};

describe('ConversationDetails', () => {
  it("returns the right actions depending on the conversation's type for non group creators", () => {
    const conversation = new Conversation();
    spyOn(conversation, 'firstUserEntity').and.returnValue({isConnected: () => true});
    spyOn(conversation, 'is_cleared').and.returnValue(false);
    spyOn(conversation, 'isCreatedBySelf').and.returnValue(false);

    const defaultProps = getDefaultParams();
    const {roleRepository, teamState} = defaultProps;

    const {rerender} = render(<ConversationDetails {...defaultProps} activeConversation={conversation} />);

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

    const firstParticipant = conversation.firstUserEntity();
    const is1to1 = conversation.is1to1();
    const isRequest = conversation.isRequest();
    const isSingleUserMode = is1to1 || isRequest;
    const isServiceMode = isSingleUserMode && firstParticipant.isService;
    const isTeam = teamState.isTeam();

    return tests.forEach(({expected, permission, conversationType}) => {
      conversation.type(conversationType);

      rerender(<ConversationDetails {...defaultProps} activeConversation={conversation} />);

      const is1to1Action = conversation.is1to1();
      const isSingleUser = is1to1Action || conversation.isRequest();
      const firstUser = conversation.firstUserEntity();

      const allMenuElements = [
        {
          condition: permission.canCreateGroupConversation() && is1to1Action && !isServiceMode,
          item: {
            click: () => jest.fn(),
            icon: 'group-icon',
            identifier: 'go-create-group',
            label: t('conversationDetailsActionCreateGroup'),
          },
        },
        {
          condition: true,
          item: {
            click: () => jest.fn(),
            icon: 'archive-icon',
            identifier: 'do-archive',
            label: t('conversationDetailsActionArchive'),
          },
        },
        {
          condition: conversation.isRequest(),
          item: {
            click: () => jest.fn(),
            icon: 'close-icon',
            identifier: 'do-cancel-request',
            label: t('conversationDetailsActionCancelRequest'),
          },
        },
        {
          condition: conversation.isClearable(),
          item: {
            click: () => jest.fn(),
            icon: 'eraser-icon',
            identifier: 'do-clear',
            label: t('conversationDetailsActionClear'),
          },
        },
        {
          condition: isSingleUser && (firstUser?.isConnected() || firstUser?.isRequest()),
          item: {
            click: () => jest.fn(),
            icon: 'block-icon',
            identifier: 'do-block',
            label: t('conversationDetailsActionBlock'),
          },
        },
        {
          condition: conversation.isLeavable() && roleRepository.canLeaveGroup(conversation),
          item: {
            click: () => jest.fn(),
            icon: 'leave-icon',
            identifier: 'do-leave',
            label: t('conversationDetailsActionLeave'),
          },
        },
        {
          condition:
            !isSingleUser && isTeam && roleRepository.canDeleteGroup(conversation) && conversation.isCreatedBySelf(),
          item: {
            click: () => jest.fn(),
            icon: 'delete-icon',
            identifier: 'do-delete',
            label: t('conversationDetailsActionDelete'),
          },
        },
      ];

      const items = allMenuElements.filter(menuElement => menuElement.condition).map(menuElement => menuElement.item);
      const mappedItems = items.map(item => item.identifier);

      expect(mappedItems).toEqual(expected);
    });
  });
});

function createPanelViewModel() {
  const panelViewModel: Partial<PanelViewModel> = {
    isVisible: ko.pureComputed<boolean>(() => true),
    togglePanel: jest.fn(),
  };
  return panelViewModel as PanelViewModel;
}
