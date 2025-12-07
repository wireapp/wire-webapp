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
import {ClientClassification} from '@wireapp/api-client/lib/client/';
import ko from 'knockout';
import type {ClientEntity} from 'Repositories/client/ClientEntity';

import {DeviceCard} from './DeviceCard';

function createClientEntity(clientEntity: Partial<ClientEntity>): ClientEntity {
  const device: Partial<ClientEntity> = {
    getName: () => 'example name',
    id: 'example',
    label: 'example label',
    ...clientEntity,
  };

  return device as ClientEntity;
}

describe('DeviceCard', () => {
  it('shows disclose icon when component is clickable', async () => {
    const props = {
      click: jest.fn(),
      device: createClientEntity({
        class: ClientClassification.PHONE,
        meta: {
          isVerified: ko.observable<boolean>(false),
        },
      }),
      showIcon: true,
    };

    const {getByTestId} = render(<DeviceCard {...props} />);
    expect(getByTestId('disclose-icon')).not.toBeNull();
  });
});
