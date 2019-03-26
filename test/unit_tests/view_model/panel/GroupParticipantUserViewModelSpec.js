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

import UUID from 'uuidjs';
import GroupParticipantUserViewModel from 'src/script/view_model/panel/GroupParticipantUserViewModel';
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

  it('returns the id of the entity attached', () => {
    const userId = UUID.genV4();
    const user = new User(userId);
    groupParticipantUserViewModel.initView({entity: user});

    expect(groupParticipantUserViewModel.getEntityId()).toBe(userId);
  });
});
