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
import {AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import ko from 'knockout';

import en from 'I18n/en-US.json';
import {withTheme, generateQualifiedIds} from 'src/script/auth/util/test/TestUtil';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'src/script/entity/message/FailedToAddUsersMessage';
import {User} from 'src/script/entity/User';
import {UserState} from 'src/script/user/UserState';
import {setStrings} from 'Util/LocalizerUtil';

import {FailedToAddUsersMessage} from './FailedToAddUsersMessage';

setStrings({en});

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
  it('shows that 1 user could not be added', async () => {
    const userState = new UserState();
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
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2] = generateQualifiedIds(2, 'test.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
      reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
    });

    const {getByTestId} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');
  });

  it('shows details of failed to add multi users', async () => {
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2] = generateQualifiedIds(2, 'test.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
      reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
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
    // TODO: remove this condition when full specs are implemented
    expect(elementMessageFailedToAddDetails.getAttribute('data-uie-value')).toEqual(false ? qualifiedId1.domain : '');
  });

  it('shows details of failed to add multi users from 2 different backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
      reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
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
    // TODO: remove this condition when full specs are implemented
    expect(elementMessageFailedToAddDetails[0].getAttribute('data-uie-value')).toEqual(
      false ? qualifiedId1.domain : '',
    );
    // expect(elementMessageFailedToAddDetails[1].getAttribute('data-uie-value')).toEqual(qualifiedId2.domain);
  });

  it('shows details of failed to add users from non federating backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = new User(qualifiedId1.id, qualifiedId1.domain);
    const user2 = new User(qualifiedId2.id, qualifiedId2.domain);
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessage({
      qualifiedIds: [qualifiedId1, qualifiedId2],
      reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
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
    expect(elementMessageFailedToAddDetails[0].textContent).toContain(
      // 'We're currently using the MVP implementation of error messages, the full spec will be the following
      // 'could not be added to the group as their backends do not federate with each other',
      'could not be added to the group',
    );
  });
});
