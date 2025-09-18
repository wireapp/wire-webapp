/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {AVATAR_SIZE} from 'Components/Avatar';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';

import {ServiceAvatar} from './ServiceAvatar';

describe('ServiceAvatar', () => {
  it('shows a service icon', async () => {
    const service = new ServiceEntity({id: 'id'});

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    };

    const {getByTestId} = render(<ServiceAvatar {...props} />);

    expect(getByTestId('element-avatar-service-icon')).not.toBeNull();
  });

  it('does not show initials', async () => {
    const service = new ServiceEntity({id: 'id'});
    service.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    };

    const {queryByTestId} = render(<ServiceAvatar {...props} />);

    expect(queryByTestId('element-avatar-initials')).toBeNull();
  });

  it('does not show avatar badge', async () => {
    const service = new ServiceEntity({id: 'id'});
    service.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    };

    const {queryByTestId} = render(<ServiceAvatar {...props} />);

    expect(queryByTestId('element-avatar-user-badge-icon')).toBeNull();
  });
});
