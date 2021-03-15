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

import ko from 'knockout';
import {ClientClassification} from '@wireapp/api-client/src/client';
import TestPage from 'Util/test/TestPage';
import DeviceCard, {DeviceCardProps} from './DeviceCard';
import type {ClientEntity} from '../../client/ClientEntity';

function createClientEntity(clientEntity: Partial<ClientEntity>): ClientEntity {
  const device: Partial<ClientEntity> = {
    getName: () => 'example name',
    id: 'example',
    label: 'example label',
    ...clientEntity,
  };

  return device as ClientEntity;
}

class DeviceCardPage extends TestPage<DeviceCardProps> {
  constructor(props?: DeviceCardProps) {
    super(DeviceCard, props);
  }

  getDesktopIcon = () => this.get('svg[data-uie-name="status-desktop-device"]');
  getMobileDeviceIcon = () => this.get('svg[data-uie-name="status-mobile-device"]');
  getDiscloseIcon = () => this.get('svg[data-uie-name="disclose-icon"]');
  getVerifiedIcon = () => this.get('svg[data-uie-name="user-device-verified"]');
  getNotVerifiedIcon = () => this.get('svg[data-uie-name="user-device-not-verified"]');
}

describe('DeviceCard', () => {
  it('renders desktop icon for desktop clients', async () => {
    const deviceCard = new DeviceCardPage({
      device: createClientEntity({
        class: ClientClassification.DESKTOP,
        meta: {
          isVerified: ko.observable(false),
        },
      }),
      showIcon: true,
    });

    expect(deviceCard.getDesktopIcon().exists()).toBe(true);
  });

  it('renders mobile devices icon for non-desktop clients', async () => {
    const deviceCard = new DeviceCardPage({
      device: createClientEntity({
        class: ClientClassification.PHONE,
        meta: {
          isVerified: ko.observable(false),
        },
      }),
      showIcon: true,
    });

    expect(deviceCard.getMobileDeviceIcon().exists()).toBe(true);
  });

  it('shows disclose icon when component is clickable', async () => {
    const deviceCard = new DeviceCardPage({
      click: () => undefined,
      device: createClientEntity({
        class: ClientClassification.PHONE,
        meta: {
          isVerified: ko.observable(false),
        },
      }),
      showIcon: true,
    });

    expect(deviceCard.getDiscloseIcon().exists()).toBe(true);
  });

  it('shows verified icon', async () => {
    const deviceCard = new DeviceCardPage({
      device: createClientEntity({
        class: ClientClassification.PHONE,
        meta: {
          isVerified: ko.observable(true),
        },
      }),
      showIcon: true,
      showVerified: true,
    });

    expect(deviceCard.getVerifiedIcon().exists()).toBe(true);
  });

  it('shows unverified icon', async () => {
    const deviceCard = new DeviceCardPage({
      device: createClientEntity({
        class: ClientClassification.PHONE,
        meta: {
          isVerified: ko.observable(false),
        },
      }),
      showIcon: true,
      showVerified: true,
    });

    expect(deviceCard.getNotVerifiedIcon().exists()).toBe(true);
  });
});
