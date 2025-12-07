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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import en from 'I18n/en-US.json';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'Repositories/entity/message/FailedToAddUsersMessage';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/UserState';
import {withTheme, generateQualifiedIds} from 'src/script/auth/util/test/TestUtil';
import {setStrings} from 'Util/LocalizerUtil';

import {FailedToAddUsersMessage} from './FailedToAddUsersMessage';

setStrings({en});

const createFailedToAddUsersMessages = (
  failures: AddUsersFailure[] = [{users: [], backends: [], reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}],
) => {
  return new FailedToAddUsersMessageEntity(failures, Date.now());
};

function createUser(qualifiedId: QualifiedId, name: string) {
  const user = new User(qualifiedId.id, qualifiedId.domain);
  user.name(name);
  return user;
}

describe('FailedToAddUsersMessage', () => {
  it('shows that 1 user could not be added', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Felix');
    userState.users.push(user1);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [],
      },
    ]);

    const {getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Felix could not be added to the group as the backend of test.domain could not be reached.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);
  });

  it('shows that multiple users could not be added', async () => {
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2, qualifiedId3] = generateQualifiedIds(3, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Virgile');
    const user2 = createUser(qualifiedId2, 'Bardia');
    const user3 = createUser(qualifiedId3, 'Patryk');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2, qualifiedId3],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [],
      },
    ]);

    const {getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add multi users', async () => {
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2, qualifiedId3] = generateQualifiedIds(3, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Tim');
    const user2 = createUser(qualifiedId2, 'Adrian');
    const user3 = createUser(qualifiedId3, 'Przemek');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2, qualifiedId3],
        backends: ['test.domain'],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
      },
    ]);

    const {getByText, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );

    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const toggleButton = getByText('Show details');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Adrian, Przemek and Tim could not be added to the group as the backend of test.domain could not be reached.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add multi users from 2 different backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = createUser(qualifiedId1, 'Tom');
    const user2 = createUser(qualifiedId2, 'Arjita');
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: ['test.domain', 'test-2.domain'],
      },
    ]);

    const {getByText, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '2 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const toggleButton = getByText('Show details');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Arjita and Tom could not be added to the group as the backend of test.domain, test-2.domain could not be reached.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add users from non federating backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = createUser(qualifiedId1, 'Patryk');
    const user2 = createUser(qualifiedId2, 'Przemek');
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2],
        reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
        backends: [],
      },
    ]);

    const {getByTestId, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Przemek and Patryk could not be added to the group as their backends do not federate with each other.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of multiple failed reasons', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');
    const [qualifiedId3] = generateQualifiedIds(1, 'test-3.domain');

    const user1 = createUser(qualifiedId1, 'Patryk');
    const user2 = createUser(qualifiedId2, 'Przemek');
    const user3 = createUser(qualifiedId3, 'Tom');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1],
        reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
        backends: [],
      },
      {
        users: [qualifiedId2],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [qualifiedId2.domain],
      },
      {
        users: [qualifiedId3],
        reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG,
      },
    ]);

    const {getByTestId, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const details1 = getAllByText(
      (_, element) =>
        element?.textContent ===
        `${user1.name()} could not be added to the group as their backends do not federate with each other.`,
    );

    expect(details1.length).toBeGreaterThanOrEqual(1);

    const details2 = getAllByText(
      (_, element) =>
        element?.textContent ===
        `${user2.name()} could not be added to the group as the backend of ${user2.qualifiedId.domain} could not be reached.`,
    );

    expect(details2.length).toBeGreaterThanOrEqual(1);

    const details3 = getAllByText(
      (_, element) => element?.textContent === `${user3.name()} could not be added to the group.`,
    );

    expect(details3.length).toBeGreaterThanOrEqual(1);
  });
});
