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

import {render, waitFor} from '@testing-library/react';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/userRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {Core} from 'src/script/service/coreSingleton';

import {UserModal, UserModalProps} from './userModal';
import {showUserModal} from './userModal.state';

describe('UserModal', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  it('correctly fetches user from user repository', async () => {
    jest.useFakeTimers();
    const refreshUser = jest.fn(async (id: QualifiedId) => {
      return new User('mock-id', 'test-domain.mock', translateForTest);
    });

    const props: UserModalProps = {
      core: {} as Core,
      teamState: {} as TeamState,
      userRepository: {
        refreshUser,
      } as unknown as UserRepository,
      selfUser: new User('', '', translateForTest),
    };
    showUserModal({domain: 'test-domain.mock', id: 'mock-id'});
    const {getByTestId} = render(<UserModal {...props} />, {wrapper: rootProviderWrapper});
    await waitFor(() => getByTestId('do-close'));

    expect(refreshUser).toHaveBeenCalledTimes(1);
  });

  it('shows user not found when user is deleted', async () => {
    jest.useFakeTimers();
    const refreshUser = jest.fn(async (id: QualifiedId) => {
      const user = new User('mock-id', 'test-domain.mock', translateForTest);
      user.isDeleted = true;
      return user;
    });

    const props: UserModalProps = {
      core: {} as Core,
      teamState: {} as TeamState,
      userRepository: {
        refreshUser,
      } as unknown as UserRepository,
      selfUser: new User('', '', translateForTest),
    };

    showUserModal({domain: 'test-domain.mock', id: 'mock-id'});

    const {getByTestId} = render(<UserModal {...props} />, {wrapper: rootProviderWrapper});

    expect(refreshUser).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getByTestId('status-modal-text')).toBeInstanceOf(HTMLDivElement);
    });
  });
});
