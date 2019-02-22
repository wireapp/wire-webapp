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

import GroupParticipantUserViewModel from 'src/script/view_model/panel/GroupParticipantUserViewModel';
import Conversation from 'src/script/entity/Conversation';
import User from 'src/script/entity/User';

describe('GroupParticipantUserViewModel', () => {
  const testFactory = new window.TestFactory();
  let groupParticipantUserViewModel;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(() => {
      const noop = () => {};
      groupParticipantUserViewModel = new GroupParticipantUserViewModel({
        isVisible: noop,
        mainViewModel: {},
        navigateTo: noop,
        onClose: noop,
        onGoBack: noop,
        onGoToRoot: noop,
        repositories: {
          conversation: TestFactory.conversation_repository,
          user: TestFactory.user_repository,
        },
      });
    });
  });

  describe('getParticipantActions', () => {
    const tests = [
      {
        expected: ['go-profile', 'do-leave'],
        getParams: () => {
          const user = new User();
          user.is_me = true;

          const conversation = new Conversation();
          spyOn(conversation, 'isGroup').and.returnValue(true);
          return {conversation, user};
        },
        isActivatedAccount: true,
        testName: 'generates actions for self user profile',
      },
      {
        expected: ['go-profile'],
        getParams: () => {
          const user = new User();
          user.is_me = true;
          return {conversation: new Conversation(), user};
        },
        isActivatedAccount: false,
        testName: 'generates actions for self user profile when user is not activated',
      },
      {
        expected: ['go-conversation', 'do-block'],
        getParams: () => {
          const user = new User();
          const conversation = new Conversation();
          user.connection().status(z.connection.ConnectionStatus.ACCEPTED);
          spyOn(conversation, 'isGroup').and.returnValue(true);
          return {conversation: conversation, user};
        },
        isActivatedAccount: true,
        testName: 'generates actions for another user profile to which I am connected',
      },
    ];

    return tests.forEach(({expected, getParams, isActivatedAccount, testName}) => {
      it(testName, () => {
        const {conversation, user} = getParams();
        spyOn(groupParticipantUserViewModel.userRepository, 'isActivatedAccount').and.returnValue(isActivatedAccount);
        const items = groupParticipantUserViewModel.getParticipantActions(user, conversation);

        expect(items.map(item => item.identifier)).toEqual(expected);
      });
    });
  });
});
