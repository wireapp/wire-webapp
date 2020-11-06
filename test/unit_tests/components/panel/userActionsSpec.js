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

import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {instantiateComponent} from '../../../helper/knockoutHelpers';

import {User} from 'src/script/entity/User';
import {Conversation} from 'src/script/entity/Conversation';

import 'src/script/components/icons';
import 'src/script/components/panel/userActions';

describe('user-actions', () => {
  describe('Renders actions', () => {
    const tests = [
      {
        expected: ['go-profile', 'do-leave'],
        getParams: () => {
          const user = new User();
          user.isMe = true;

          const conversation = new Conversation();
          conversation.isGroup = () => true;
          const conversationRoleRepository = {canLeaveGroup: () => true};
          return {
            conversation: () => conversation,
            conversationRoleRepository,
            isSelfActivated: true,
            user: () => user,
          };
        },
        testName: 'generates actions for self user profile',
      },
      {
        expected: ['go-profile'],
        getParams: () => {
          const user = new User();
          user.isMe = true;
          const conversation = new Conversation();
          return {conversation: () => conversation, isSelfActivated: false, user: () => user};
        },
        testName: 'generates actions for self user profile when user is not activated',
      },
      {
        expected: ['go-conversation', 'do-block'],
        getParams: () => {
          const user = new User();
          const conversation = new Conversation();
          conversation.isGroup = () => true;
          user.connection().status(ConnectionStatus.ACCEPTED);
          return {conversation: () => conversation, isSelfActivated: true, user: () => user};
        },
        testName: 'generates actions for another user profile to which I am connected',
      },
    ];

    return tests.forEach(({expected, getParams, testName}) => {
      it(testName, () => {
        const params = getParams();
        return instantiateComponent('user-actions', params).then(domContainer => {
          expected.forEach(action => {
            const actionElement = domContainer.querySelector(`[data-uie-name=${action}]`);

            expect(actionElement).not.toBe(null);
          });
        });
      });
    });
  });
});
