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
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {generateQualifiedIds, generateUserClients, generateUsers, withTheme} from 'src/script/auth/util/test/TestUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {PartialFailureToSendWarning} from './PartialFailureToSend';
import {translateForTest} from 'Util/test/translateForTest';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('PartialFailureToSendWarning', () => {
  it('displays the number of users that did not get the message', () => {
    const nbUsers = Math.floor(Math.random() * 100) + 2;
    const users = generateUsers(nbUsers, 'domain');

    const queued = generateUserClients(users);
    const {container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{queued}} />),
      {wrapper: rootProviderWrapper},
    );
    expect(container.textContent).toContain('messageFailedToSendParticipants');
    expect(container.textContent).toContain('messageFailedToSendPlural');
  });

  it('displays the number of named users that did not get the message across multiple domains', () => {
    const nbUsersDomain1 = Math.floor(Math.random() * 100) + 2;
    const nbUsersDomain2 = Math.floor(Math.random() * 100);
    const users1 = generateUsers(nbUsersDomain1, 'domain1');
    const users2 = generateUsers(nbUsersDomain2, 'domain2');

    const queued = {
      ...generateUserClients(users1),
      ...generateUserClients(users2),
    };
    const {container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{queued}} />),
      {wrapper: rootProviderWrapper},
    );
    expect(container.textContent).toContain('messageFailedToSendParticipants');
    expect(container.textContent).toContain('messageFailedToSendPlural');
  });

  it('displays the number of unreachable users that did not get the message across multiple domains', () => {
    const nbUsersDomain1 = Math.floor(Math.random() * 100) + 2;
    const nbUsersDomain2 = Math.floor(Math.random() * 100);
    const users1 = generateQualifiedIds(nbUsersDomain1, 'domain1');
    const users2 = generateQualifiedIds(nbUsersDomain2, 'domain2');

    const failed = [...users1, ...users2];
    const {container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{failed}} />),
      {wrapper: rootProviderWrapper},
    );
    expect(container.textContent).toContain('messageFailedToSendParticipants');
    expect(container.textContent).toContain('messageFailedToSendPlural');
  });

  it('displays the number of users, named or unreachable that did not get the message across multiple domains', () => {
    const nbUsersDomain1 = Math.floor(Math.random() * 100) + 2;
    const nbUsersDomain2 = Math.floor(Math.random() * 100);
    const users1 = generateUsers(nbUsersDomain1, 'domain1');
    const users2 = generateUsers(nbUsersDomain2, 'domain2');

    const queued = {
      ...generateUserClients(users1),
      ...generateUserClients(users2),
    };

    const nbUnreachableUsersDomain1 = Math.floor(Math.random() * 100);
    const nbUnreachableUsersDomain2 = Math.floor(Math.random() * 100);
    const unreachableUsers1 = generateQualifiedIds(nbUnreachableUsersDomain1, 'domain1');
    const unreachableUsers2 = generateQualifiedIds(nbUnreachableUsersDomain2, 'domain2');

    const failed = [...unreachableUsers1, ...unreachableUsers2];
    const {container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{queued, failed}} />),
      {wrapper: rootProviderWrapper},
    );
    expect(container.textContent).toContain('messageFailedToSendParticipants');
    expect(container.textContent).toContain('messageFailedToSendPlural');
  });

  it('does not show the extra info toggle if there is only a single named user', () => {
    const users = generateUsers(1, 'domain');
    const queued = generateUserClients(users);
    const {queryByText, container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={users} failedToSend={{queued}} />),
      {wrapper: rootProviderWrapper},
    );

    expect(queryByText('messageFailedToSendShowDetails')).toBeNull();
    expect(container.textContent).toContain(users[0].name());
    expect(container.textContent).toContain('messageFailedToSendWillReceiveSingular');
  });

  it('does not show the extra info toggle if there is only a single unreachable user', () => {
    const users = generateQualifiedIds(1, 'domain');
    const failed = users;
    const {queryByText, container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{failed}} />),
      {wrapper: rootProviderWrapper},
    );

    expect(queryByText('messageFailedToSendShowDetails')).toBeNull();
    expect(container.textContent).toContain('messageFailedToSendParticipantsFromDomainSingular');
    expect(container.textContent).toContain('messageFailedToSendWillNotReceiveSingular');
  });

  it('toggles the extra info', () => {
    const queued = generateUserClients(generateUsers(2, 'domain'));
    const {getByText} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{queued}} />),
      {wrapper: rootProviderWrapper},
    );

    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(getByText('messageFailedToSendHideDetails')).not.toBeNull();

    act(() => {
      getByText('messageFailedToSendHideDetails').click();
    });

    expect(getByText('messageFailedToSendShowDetails')).not.toBeNull();
  });

  it('displays the username of participant that could not receive the message', () => {
    const nbUsers = Math.floor(Math.random() * 10) + 2;
    const users = generateUsers(nbUsers, 'domain');

    const queued = generateUserClients(users);
    const {getByText, getAllByTestId} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={users} failedToSend={{queued}} />),
      {wrapper: rootProviderWrapper},
    );

    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(getAllByTestId('named-user')).toHaveLength(nbUsers);
    expect(getByText('messageFailedToSendHideDetails')).not.toBeNull();
  });

  it('displays both the username of named participants and the correct domain of unreachable users when applicable', () => {
    const nbNamedUsers = Math.floor(Math.random() * 10) + 2;
    const namedUsers = generateUsers(nbNamedUsers, 'domain');
    const queued = generateUserClients(namedUsers);

    const nbUsersDomain1 = Math.floor(Math.random() * 10) + 2;
    const nbUsersDomain2 = Math.floor(Math.random() * 10) + 2;
    const failed = [
      ...generateQualifiedIds(nbUsersDomain1, 'domain1'),
      ...generateQualifiedIds(nbUsersDomain2, 'domain2'),
    ];

    const {getByText, getAllByTestId, container} = render(
      withTheme(
        <PartialFailureToSendWarning isMessageFocused knownUsers={namedUsers} failedToSend={{queued, failed}} />,
      ),
      {wrapper: rootProviderWrapper},
    );

    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(getAllByTestId('named-user')).toHaveLength(nbNamedUsers);
    expect(container.textContent).toContain('messageFailedToSendParticipantsFromDomainPlural');
    expect(container.textContent).toContain('messageFailedToSendWillNotReceivePlural');
  });

  it('displays the info toggle when there is a single named user and a single unreachable user', () => {
    const namedUsers = generateUsers(1, 'domain1');
    const queued = generateUserClients(namedUsers);

    const failed = [...generateQualifiedIds(1, 'domain2')];

    const {getByText} = render(
      withTheme(
        <PartialFailureToSendWarning isMessageFocused knownUsers={namedUsers} failedToSend={{queued, failed}} />,
      ),
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(getByText('messageFailedToSendHideDetails')).not.toBeNull();

    act(() => {
      getByText('messageFailedToSendHideDetails').click();
    });

    expect(getByText('messageFailedToSendShowDetails')).not.toBeNull();
  });

  it('does not display an unreachable user warning if there are no unreachable users', () => {
    const namedUsers = generateUsers(2, 'domain1');
    const queued = generateUserClients(namedUsers);

    const failed = [] as QualifiedId[];

    const {getByText, container} = render(
      withTheme(
        <PartialFailureToSendWarning isMessageFocused knownUsers={namedUsers} failedToSend={{queued, failed}} />,
      ),
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(container.textContent).not.toContain('messageFailedToSendWillNotReceiveSingular');
    expect(container.textContent).not.toContain('messageFailedToSendWillNotReceivePlural');
  });

  it('does not display a named user warning if there are no named users', () => {
    const failed = [...generateQualifiedIds(2, 'domain2')];

    const queued = {} as QualifiedUserClients;

    const {getByText, container} = render(
      withTheme(<PartialFailureToSendWarning isMessageFocused knownUsers={[]} failedToSend={{queued, failed}} />),
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      getByText('messageFailedToSendShowDetails').click();
    });

    expect(container.textContent).not.toContain('messageFailedToSendWillReceiveSingular');
    expect(container.textContent).not.toContain('messageFailedToSendWillReceivePlural');
  });
});
