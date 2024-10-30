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

import {render} from '@testing-library/react';

import {UserStatusBadges} from './UserStatusBadges';

describe('UserBadges', () => {
  it('should render all the badges passed in config', () => {
    const {getByTestId} = render(
      <UserStatusBadges config={{guest: true, federated: true, external: true, verified: true}} />,
    );

    expect(getByTestId('status-guest')).toBeDefined();
    expect(getByTestId('status-federated-user')).toBeDefined();
    expect(getByTestId('status-external')).toBeDefined();
    expect(getByTestId('status-verified')).toBeDefined();
  });

  it('should not render badges that are not included in the config or are falsy', () => {
    const {getByTestId, queryByTestId} = render(
      <UserStatusBadges config={{guest: true, external: true, verified: false}} />,
    );

    expect(getByTestId('status-guest')).toBeDefined();
    expect(queryByTestId('status-federated-user')).toBeNull();
    expect(getByTestId('status-external')).toBeDefined();
    expect(queryByTestId('status-verified')).toBeNull();
  });
});
