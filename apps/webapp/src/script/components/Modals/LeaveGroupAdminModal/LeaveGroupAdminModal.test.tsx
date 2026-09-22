/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import React from 'react';

import {act, fireEvent, render, waitFor} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import {generateConversation} from 'test/helper/ConversationGenerator';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {LeaveGroupAdminModal} from './LeaveGroupAdminModal';
import {useLeaveGroupAdminModalStore} from './useLeaveGroupAdminModalStore';

jest.mock('./AdminSearchInput', () => ({
  AdminSearchInput: () => <div data-uie-name="admin-search-input" />,
}));

const renderModal = () => render(withTheme(<LeaveGroupAdminModal translate={translateForTest} />));
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const renderModalWithRootProvider = () =>
  render(withTheme(<LeaveGroupAdminModal translate={translateForTest} />), {wrapper: rootProviderWrapper});

const createEligibleUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  user.username(`user.${id}`);
  return user;
};

describe('LeaveGroupAdminModal', () => {
  afterEach(() => {
    act(() => {
      useLeaveGroupAdminModalStore.getState().hide();
    });
    jest.clearAllMocks();
  });

  it('shows the no-eligible-users variant and does not show leave/promote action', () => {
    const conversation = generateConversation({name: 'Team Group'});

    act(() => {
      useLeaveGroupAdminModalStore.getState().show({
        conversation,
        eligibleUsers: [],
        onDelete: jest.fn(),
        onLeave: jest.fn().mockResolvedValue(undefined),
      });
    });

    const {getByTestId, queryByTestId} = renderModalWithRootProvider();

    expect(getByTestId('leave-group-admin-modal-message')).toHaveTextContent(
      'leaveGroupAdminModalMessageNoEligibleFirstPart',
    );
    expect(getByTestId('leave-group-admin-modal-message')).toHaveTextContent(
      'leaveGroupAdminModalMessageNoEligibleSecondPart',
    );
    expect(queryByTestId('do-leave-group-and-promote-admin')).toBeNull();
    expect(getByTestId('do-delete-group-from-leave-modal')).toBeInTheDocument();
  });

  it('keeps leave blocked when role assignment fails and resets loading state', async () => {
    const conversation = generateConversation({name: 'Team Group'});
    const selectedUser = createEligibleUser('selected-user');
    const onDelete = jest.fn();
    const onLeave = jest.fn().mockRejectedValue(new Error('Role assignment failed'));

    act(() => {
      useLeaveGroupAdminModalStore.getState().show({
        conversation,
        eligibleUsers: [selectedUser],
        onDelete,
        onLeave,
      });
      useLeaveGroupAdminModalStore.getState().setSelectedUser(selectedUser);
    });

    const {getByTestId} = renderModalWithRootProvider();
    const leaveButton = getByTestId('do-leave-group-and-promote-admin') as HTMLButtonElement;

    expect(leaveButton).not.toBeDisabled();

    fireEvent.click(leaveButton);

    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(useLeaveGroupAdminModalStore.getState().isLoading).toBe(false);
    });

    expect(leaveButton).not.toBeDisabled();
    expect(useLeaveGroupAdminModalStore.getState().isOpen).toBe(true);
  });
});
