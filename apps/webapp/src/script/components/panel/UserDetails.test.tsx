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
import {User} from 'Repositories/entity/User';
import {t} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

import {UserDetails} from './UserDetails';

describe('UserDetails', () => {
  it('renders the correct infos for a user', () => {
    const name = 'test-name';
    const userName = 'test-user-name';
    const participant = new User(createUuid());
    participant.name(name);
    participant.username(userName);

    const props = {
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    };

    const {getByText, queryByTestId} = render(<UserDetails {...props} />);

    getByText(name);
    getByText(`@${userName}`);

    expect(queryByTestId('status-verified-participant')).toBeNull();
    expect(queryByTestId('status-external')).toBeNull();
    expect(queryByTestId('status-guest')).toBeNull();
    expect(queryByTestId('status-expiration-text')).toBeNull();
    expect(queryByTestId('status-admin')).toBeNull();
  });

  it('renders the badge for a user', () => {
    const badge = 'badgeText';
    const participant = new User(createUuid());

    const props = {
      badge,
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    };

    const {getByText} = render(<UserDetails {...props} />);

    expect(getByText(badge)).not.toBeNull();
  });

  it('renders the badge for a guest', () => {
    const expirationText = '1h remaining';
    const participant = new User(createUuid());
    participant.isGuest(true);
    participant.name("I'm a guest");
    participant.isTemporaryGuest(true);
    participant.expirationText(expirationText);

    const props = {
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    };

    const {getByTestId, getByText} = render(<UserDetails {...props} />);

    expect(getByTestId('status-guest')).not.toBeNull();
    expect(getByText(expirationText)).not.toBeNull();
  });

  it('renders the placeholder avatar for a user that could not be loaded', () => {
    const participant = new User(createUuid());
    participant.name('');

    const props = {
      isGroupAdmin: false,
      isSelfVerified: true,
      isVerified: false,
      participant,
    };

    const {getByTestId} = render(<UserDetails {...props} />);

    expect(getByTestId('status-name').textContent).toBe(t('unavailableUser'));
  });
});
