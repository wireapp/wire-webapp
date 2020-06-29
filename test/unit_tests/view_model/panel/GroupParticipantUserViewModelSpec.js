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

import {noop} from 'Util/util';
import {createRandomUuid} from 'Util/util';

import {GroupParticipantUserViewModel} from 'src/script/view_model/panel/GroupParticipantUserViewModel';
import {User} from 'src/script/entity/User';
import {TestFactory} from '../../../helper/TestFactory';

describe('GroupParticipantUserViewModel', () => {
  const testFactory = new TestFactory();
  let groupParticipantUserViewModel;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(() => {
      groupParticipantUserViewModel = new GroupParticipantUserViewModel({
        isVisible: noop,
        mainViewModel: {},
        navigateTo: noop,
        onClose: noop,
        onGoBack: noop,
        onGoToRoot: noop,
        repositories: {
          conversation: testFactory.conversation_repository,
          team: testFactory.team_repository,
          user: testFactory.user_repository,
        },
      });
    });
  });

  it('returns the id of the entity attached', () => {
    const userId = createRandomUuid();
    const user = new User(userId);
    groupParticipantUserViewModel.initView({entity: user});

    expect(groupParticipantUserViewModel.getEntityId()).toBe(userId);
  });
});
