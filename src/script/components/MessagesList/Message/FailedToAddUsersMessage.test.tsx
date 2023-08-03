/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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
import ko from 'knockout';

import {withTheme, generateQualifiedIds} from 'src/script/auth/util/test/TestUtil';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'src/script/entity/message/FailedToAddUsersMessage';
import {User} from 'src/script/entity/User';
import {UserRepository} from 'src/script/user/UserRepository';
import {UserState} from 'src/script/user/UserState';
import {TestFactory} from 'test/helper/TestFactory';

import {FailedToAddUsersMessage} from './FailedToAddUsersMessage';

const createFailedToAddUsersMessage = (partialFailedToAddUsersMessage: Partial<FailedToAddUsersMessageEntity>) => {
  const failedToAddUsersMessage: Partial<FailedToAddUsersMessageEntity> = {
    displayTimestampLong: () => '',
    displayTimestampShort: () => '',
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    ...partialFailedToAddUsersMessage,
  };
  return failedToAddUsersMessage as FailedToAddUsersMessageEntity;
};

describe('FailedToAddUsersMessage', () => {
  const testFactory = new TestFactory();
  let userState: UserState;
  let userRepository: UserRepository;

  beforeAll(async () => {
    userRepository = await testFactory.exposeUserActors();
    userState = userRepository['userState'];
  });

  afterEach(() => {
    userRepository['userState'].users.removeAll();
  });

  it('shows that 1 user could not be added', async () => {
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    userState.users.push(user1);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1],
    });

    const {getByTestId} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('1-user-not-added');
  });

  it('shows that multiple users could not be added', async () => {
    const [qualifiedId1, qualifiedId2] = generateQualifiedIds(2, 'test.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
    });

    const {getByTestId} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');
  });

  it('shows details of failed to add multi users', async () => {
    const [qualifiedId1, qualifiedId2] = generateQualifiedIds(2, 'test.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
    });

    const {getByTestId} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const elementMessageFailedToAddDetails = getByTestId('multi-user-not-added-details');
    expect(elementMessageFailedToAddDetails.getAttribute('data-uie-value')).toEqual(qualifiedId1.domain);
  });

  it('shows details of failed to add multi users from 2 different backends', async () => {
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
    });

    const {getByTestId, getAllByTestId} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const elementMessageFailedToAddDetails = getAllByTestId('multi-user-not-added-details');
    expect(elementMessageFailedToAddDetails[0].getAttribute('data-uie-value')).toEqual(qualifiedId1.domain);
    expect(elementMessageFailedToAddDetails[1].getAttribute('data-uie-value')).toEqual(qualifiedId2.domain);
  });
});
