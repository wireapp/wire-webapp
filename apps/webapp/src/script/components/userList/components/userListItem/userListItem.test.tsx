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

import {render, type RenderResult} from '@testing-library/react';
import {noop} from 'noop-esm';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {UserlistMode} from '../../userList';

import {UserListItem, type UserListItemProps} from './userListItem';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('UserListItem', () => {
  it('keeps the avatar node when an unrelated prop changes', () => {
    const user = new User('user-id', 'example.com', translateForTest);
    user.name('Alice Example');

    const properties: UserListItemProps = {
      canSelect: false,
      external: false,
      isHighlighted: false,
      isSelected: false,
      isSelfVerified: false,
      mode: UserlistMode.COMPACT,
      noInteraction: false,
      noUnderline: false,
      onClick: noop,
      onKeyDown: noop,
      showArrow: false,
      user,
    };

    const {container, rerender} = render(
      <UserListItem
        canSelect={properties.canSelect}
        external={properties.external}
        isHighlighted={properties.isHighlighted}
        isSelected={properties.isSelected}
        isSelfVerified={properties.isSelfVerified}
        mode={properties.mode}
        noInteraction={properties.noInteraction}
        noUnderline={properties.noUnderline}
        onClick={properties.onClick}
        onKeyDown={properties.onKeyDown}
        showArrow={properties.showArrow}
        user={properties.user}
      />,
      {wrapper: rootProviderWrapper},
    );
    const initialAvatar = container.querySelector('[data-uie-name="element-avatar-user"]');

    rerender(
      <UserListItem
        canSelect={properties.canSelect}
        external={properties.external}
        isHighlighted={true}
        isSelected={properties.isSelected}
        isSelfVerified={properties.isSelfVerified}
        mode={properties.mode}
        noInteraction={properties.noInteraction}
        noUnderline={properties.noUnderline}
        onClick={properties.onClick}
        onKeyDown={properties.onKeyDown}
        showArrow={properties.showArrow}
        user={properties.user}
      />,
    );

    const rerenderedAvatar = container.querySelector('[data-uie-name="element-avatar-user"]');
    expect(rerenderedAvatar).toBe(initialAvatar);
  });

  describe('pending onboarding', () => {
    const createPendingUser = (): User => {
      const user = new User('user-id', 'example.com', translateForTest);
      user.name('Alice Example');
      user.username('alice');
      user.isPendingOnboarding(true);
      return user;
    };

    const renderUserListItem = (user: User, showPendingOnboarding?: boolean): RenderResult => {
      return render(
        <UserListItem
          canSelect={false}
          external={false}
          isHighlighted={false}
          isSelected={false}
          isSelfVerified={false}
          mode={UserlistMode.COMPACT}
          noInteraction={false}
          noUnderline={false}
          onClick={noop}
          onKeyDown={noop}
          showArrow={false}
          showPendingOnboarding={showPendingOnboarding}
          user={user}
        />,
        {wrapper: rootProviderWrapper},
      );
    };

    it('keeps the handle as subtitle and shows the badge', () => {
      const {getByTestId} = renderUserListItem(createPendingUser(), true);

      expect(getByTestId('status-username').textContent).toBe('@alice');
      expect(getByTestId('status-pending-onboarding')).toBeDefined();
    });

    it('shows the pending onboarding subtitle when the user has no handle', () => {
      const user = createPendingUser();
      user.username('');
      const {getByTestId} = renderUserListItem(user, true);

      expect(getByTestId('status-username').textContent).toBe('userOnboardingPending');
      expect(getByTestId('status-pending-onboarding')).toBeDefined();
    });

    it('does not show the pending onboarding state when it is not requested', () => {
      const {getByTestId, queryByTestId} = renderUserListItem(createPendingUser());

      expect(getByTestId('status-username').textContent).toBe('@alice');
      expect(queryByTestId('status-pending-onboarding')).toBeNull();
    });

    it('does not show the pending onboarding state for contactable users', () => {
      const user = createPendingUser();
      user.isPendingOnboarding(false);
      const {getByTestId, queryByTestId} = renderUserListItem(user, true);

      expect(getByTestId('status-username').textContent).toBe('@alice');
      expect(queryByTestId('status-pending-onboarding')).toBeNull();
    });
  });
});
