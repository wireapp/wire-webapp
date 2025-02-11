/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {fireEvent, render} from '@testing-library/react';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {noop} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {GroupList} from './GroupList';

import {Conversation} from '../../../../../entity/Conversation';
import {User} from '../../../../../entity/User';
import {navigate} from '../../../../../router/Router';

jest.mock('../../../../../router/Router', () => ({
  navigate: jest.fn(),
}));

const getGroupItemById = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-uie-name="item-group"][data-uie-uid="${id}"]`);

describe('GroupList', () => {
  const createGroupConversation = (name: string, id = createUuid()) => {
    const conversation = new Conversation(id);
    const userIds: QualifiedId[] = [
      {
        domain: '',
        id: createUuid(),
      },
      {
        domain: '',
        id: createUuid(),
      },
    ];
    const users = userIds.map(userId => new User(userId.id, userId.domain));
    conversation.participating_user_ids.push(...userIds);
    conversation.participating_user_ets.push(...users);
    return conversation;
  };

  const create1on1Conversation = (name: string, id = createUuid()) => {
    const conversation = createGroupConversation(name, id);
    conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
    return conversation;
  };

  it('shows group list', () => {
    const groups = [createGroupConversation('groupA'), create1on1Conversation('groupB')];

    const props = {
      click: noop,
      groups,
    };

    const {container} = render(withTheme(<GroupList {...props} />));

    expect(getGroupItemById(container, groups[0].id)).not.toBeNull();
    expect(getGroupItemById(container, groups[1].id)).not.toBeNull();
  });

  it('shows group list and navigates conversation on click', () => {
    const groups = [createGroupConversation('groupA'), create1on1Conversation('groupB')];
    const onClickSpy = jest.fn();

    const props = {
      click: onClickSpy,
      groups,
    };

    const {container} = render(withTheme(<GroupList {...props} />));

    const itemGroup1 = getGroupItemById(container, groups[0].id);
    fireEvent.click(itemGroup1!);

    expect(navigate).toHaveBeenCalledWith(`/conversation/${groups[0].id}`);
    expect(onClickSpy).toHaveBeenCalledWith(groups[0]);

    const itemGroup2 = getGroupItemById(container, groups[1].id);
    fireEvent.click(itemGroup2!);

    expect(navigate).toHaveBeenCalledWith(`/conversation/${groups[1].id}`);
    expect(onClickSpy).toHaveBeenCalledWith(groups[1]);
  });
});
