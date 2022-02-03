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

import TestPage from 'Util/test/TestPage';
import {AVATAR_SIZE} from 'Components/Avatar';

import ServiceAvatar, {ServiceAvatarProps} from './ServiceAvatar';
import {ServiceEntity} from '../../integration/ServiceEntity';

jest.mock('../../auth/util/SVGProvider');

class ServiceAvatarPage extends TestPage<ServiceAvatarProps> {
  constructor(props?: ServiceAvatarProps) {
    super(ServiceAvatar, props);
  }

  getInitials = () => this.get('div[data-uie-name="element-avatar-initials"]');
  getServiceIcon = () => this.get('div[data-uie-name="element-avatar-service-icon"]');
  getUserBadgeIcon = () => this.get('div[data-uie-name="element-avatar-user-badge-icon"]');
}

describe('ServiceAvatar', () => {
  it('shows a service icon', async () => {
    const service = new ServiceEntity({id: 'id'});

    const serviceAvatar = new ServiceAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    });

    expect(serviceAvatar.getServiceIcon().exists()).toBe(true);
  });

  it('does not show initials', async () => {
    const service = new ServiceEntity({id: 'id'});
    service.name = 'Anton Bertha';

    const serviceAvatar = new ServiceAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    });

    expect(serviceAvatar.getInitials().exists()).toBe(false);
  });

  it('does not show avatar badge', async () => {
    const service = new ServiceEntity({id: 'id'});
    service.name = 'Anton Bertha';

    const serviceAvatar = new ServiceAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: service,
    });

    expect(serviceAvatar.getUserBadgeIcon().exists()).toBe(false);
  });
});
