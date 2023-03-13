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

import {act, render} from '@testing-library/react';
import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';

import en from 'I18n/en-US.json';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {setStrings} from 'Util/LocalizerUtil';
import {createRandomUuid} from 'Util/util';

import {PartialFailureToSendWarning, User} from './PartialFailureToSend';

setStrings({en});
function generateUsers(nbUsers: number, domain: string) {
  const users: User[] = [];
  for (let i = 0; i < nbUsers; i++) {
    users.push({qualifiedId: {id: createRandomUuid(), domain}, username: () => `User ${i}`});
  }
  return users;
}

function generateUserClients(users: User[]): QualifiedUserClients {
  const userClients: QualifiedUserClients = {};
  users.forEach(user => {
    const domainUsers = userClients[user.qualifiedId.domain] || {};
    domainUsers[user.qualifiedId.id] = [];
    userClients[user.qualifiedId.domain] = domainUsers;
  });
  return userClients;
}

describe('PartialFailureToSendWarning', () => {
  it('displays the number of users that did not get the message', () => {
    const nbUsers = Math.floor(Math.random() * 100);
    const users = generateUsers(nbUsers, 'domain');

    const failedToSend = generateUserClients(users);
    const {container} = render(withTheme(<PartialFailureToSendWarning knownUsers={[]} failedToSend={failedToSend} />));
    expect(container.textContent).toContain(`${nbUsers} Participants had issues receiving this message`);
  });

  it('displays the number of users that did not get the message across multiple domains', () => {
    const nbUsersDomain1 = Math.floor(Math.random() * 100);
    const nbUsersDomain2 = Math.floor(Math.random() * 100);
    const users1 = generateUsers(nbUsersDomain1, 'domain1');
    const users2 = generateUsers(nbUsersDomain2, 'domain2');

    const failedToSend = {
      ...generateUserClients(users1),
      ...generateUserClients(users2),
    };
    const {container} = render(withTheme(<PartialFailureToSendWarning knownUsers={[]} failedToSend={failedToSend} />));
    expect(container.textContent).toContain(
      `${nbUsersDomain1 + nbUsersDomain2} Participants had issues receiving this message`,
    );
  });

  it('does not show the extra info toggle if there is only a single user', () => {
    const users = generateUsers(1, 'domain');
    const failedToSend = generateUserClients(users);
    const {queryByText, container} = render(
      withTheme(<PartialFailureToSendWarning knownUsers={users} failedToSend={failedToSend} />),
    );

    expect(queryByText('Show details')).toBeNull();
    expect(container.textContent).toContain(`${users[0].username()} will receive your message later`);
  });

  it('toggles the extra info', () => {
    const failedToSend = generateUserClients(generateUsers(2, 'domain'));
    const {getByText} = render(withTheme(<PartialFailureToSendWarning knownUsers={[]} failedToSend={failedToSend} />));

    act(() => {
      getByText('Show details').click();
    });

    expect(getByText('Hide details')).not.toBeNull();

    act(() => {
      getByText('Hide details').click();
    });

    expect(getByText('Show details')).not.toBeNull();
  });

  it('displays the username of participant that could not receive the message', () => {
    const nbUsers = Math.floor(Math.random() * 10) + 2;
    const users = generateUsers(nbUsers, 'domain');

    const failedToSend = generateUserClients(users);
    const {getByText, getAllByTestId} = render(
      withTheme(<PartialFailureToSendWarning knownUsers={users} failedToSend={failedToSend} />),
    );

    act(() => {
      getByText('Show details').click();
    });

    expect(getAllByTestId('recipient')).toHaveLength(nbUsers);
    expect(getByText('Hide details')).not.toBeNull();
  });
});
