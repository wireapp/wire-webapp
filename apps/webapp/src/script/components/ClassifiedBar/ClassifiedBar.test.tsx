/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {render} from '@testing-library/react';

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {createUuid} from 'Util/uuid';

import {ConversationClassifiedBar} from './ClassifiedBar';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('ClassifiedBar', () => {
  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const classifiedDomains = ['same.domain', 'classified.domain', 'other-classified.domain'];
  const sameDomainUser = new User(createUuid(), 'same.domain', translateForTest);
  const classifiedDomainUser = new User(createUuid(), 'classified.domain', translateForTest);
  const otherDomainUser = new User(createUuid(), 'other.domain', translateForTest);

  it.each([[[sameDomainUser]], [[sameDomainUser, otherDomainUser]]])('is empty if no domains are given', users => {
    conversation.participating_user_ets(users);
    const {container} = render(<ConversationClassifiedBar conversation={conversation} conversationDomain="test" />, {
      wrapper: rootProviderWrapper,
    });

    expect(container.querySelector('[data-uie-name=classified-label]')).toBe(null);
  });

  it.each([[[sameDomainUser]], [[classifiedDomainUser]], [[sameDomainUser, classifiedDomainUser]]])(
    'returns classified if all users in the classified domains',
    users => {
      conversation.participating_user_ets(users);
      const {getByText, queryByText} = render(
        <ConversationClassifiedBar
          conversationDomain={classifiedDomainUser.domain}
          conversation={conversation}
          classifiedDomains={classifiedDomains}
        />,
        {wrapper: rootProviderWrapper},
      );

      expect(getByText('conversationClassified')).not.toBe(null);
      expect(queryByText('conversationNotClassified')).toBe(null);
    },
  );

  it.each([
    [[sameDomainUser, otherDomainUser]],
    [[classifiedDomainUser, otherDomainUser]],
    [[sameDomainUser, classifiedDomainUser, otherDomainUser]],
  ])('returns non-classified if a single user is from another domain', users => {
    conversation.participating_user_ets(users);
    const {queryByText, getByText} = render(
      <ConversationClassifiedBar
        conversationDomain={classifiedDomains[0]}
        conversation={conversation}
        classifiedDomains={classifiedDomains}
      />,
      {wrapper: rootProviderWrapper},
    );

    expect(queryByText('conversationClassified')).toBe(null);
    expect(getByText('conversationNotClassified')).not.toBe(null);
  });
});
