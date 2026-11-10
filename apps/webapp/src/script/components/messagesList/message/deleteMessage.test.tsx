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

import {render} from '@testing-library/react';

import {DeleteMessage as DeleteMessageEntity} from '../../../repositories/entity/message/deleteMessage';
import {User} from '../../../repositories/entity/User';
import {translateForTest} from '../../../util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {createUuid} from '../../../util/uuid';

import {DeleteMessage} from './deleteMessage';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createDeleteMessage = (sender: User): DeleteMessageEntity => {
  const deleteMessage = new DeleteMessageEntity(translateForTest);
  deleteMessage.user(sender);
  return deleteMessage;
};

describe('DeleteMessage', () => {
  it('shows sender name', async () => {
    const sender = new User(createUuid(), '', translateForTest);
    sender.name('felix');
    const message = createDeleteMessage(sender);

    const {getByTestId, getByText} = render(<DeleteMessage message={message} />, {wrapper: rootProviderWrapper});

    expect(getByTestId('element-message-delete')).not.toBeNull();
    expect(getByText(sender.name())).not.toBeNull();
  });
});
