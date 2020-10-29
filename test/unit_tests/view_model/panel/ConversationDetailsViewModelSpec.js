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

import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';
import {noop} from 'Util/util';

import {ConversationDetailsViewModel} from 'src/script/view_model/panel/ConversationDetailsViewModel';
import {Conversation} from 'src/script/entity/Conversation';

describe('ConversationDetailsViewModel', () => {
  describe('getConversationActions', () => {
    it("returns the right actions depending on the conversation's type for non group creators", () => {
      const conversation = new Conversation();
      spyOn(conversation, 'firstUserEntity').and.returnValue({isConnected: () => true});
      spyOn(conversation, 'is_cleared').and.returnValue(false);
      spyOn(conversation, 'isCreatedBySelf').and.returnValue(false);

      const conversationDetailsViewModel = new ConversationDetailsViewModel({
        isVisible: noop,
        mainViewModel: {},
        navigateTo: noop,
        onClose: noop,
        onGoBack: noop,
        onGoToRoot: noop,
        repositories: {
          conversation: {
            active_conversation: () => conversation,
            conversationRoleRepository: {canDeleteGroup: () => true, canLeaveGroup: () => true},
          },
          team: {
            isTeam: () => true,
          },
        },
      });

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
        conversation.type(conversationType);
        window.z.userPermission = () => permission;
        const items = conversationDetailsViewModel.getConversationActions(conversation);

        expect(items.map(item => item.identifier)).toEqual(expected);
      });
    });

    it("returns the right actions depending on the conversation's type for group creators", () => {
      const conversation = new Conversation();
      spyOn(conversation, 'firstUserEntity').and.returnValue({isConnected: () => true});
      spyOn(conversation, 'is_cleared').and.returnValue(false);
      spyOn(conversation, 'isCreatedBySelf').and.returnValue(true);

      const conversationDetailsViewModel = new ConversationDetailsViewModel({
        isVisible: noop,
        mainViewModel: {},
        navigateTo: noop,
        onClose: noop,
        onGoBack: noop,
        onGoToRoot: noop,
        repositories: {
          conversation: {
            active_conversation: () => conversation,
            conversationRoleRepository: {canDeleteGroup: () => true, canLeaveGroup: () => true},
          },
          team: {
            isTeam: () => true,
          },
        },
      });

      spyOn(conversationDetailsViewModel, 'isSelfGroupAdmin').and.returnValue(true);
      spyOn(conversationDetailsViewModel, 'isTeam').and.returnValue(true);
      spyOn(
        conversationDetailsViewModel.conversationRepository.conversationRoleRepository,
        'canDeleteGroup',
      ).and.returnValue(true);

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
          expected: ['do-archive', 'do-clear', 'do-leave', 'do-delete'],
          permission: {canCreateGroupConversation: () => true},
        },
        {
          conversationType: CONVERSATION_TYPE.CONNECT,
          expected: ['do-archive', 'do-cancel-request', 'do-block'],
          permission: {canCreateGroupConversation: () => true},
        },
      ];

      return tests.forEach(({expected, permission, conversationType}) => {
        conversation.type(conversationType);
        window.z.userPermission = () => permission;
        const items = conversationDetailsViewModel.getConversationActions(conversation);

        expect(items.map(item => item.identifier)).toEqual(expected);
      });
    });
  });
});
