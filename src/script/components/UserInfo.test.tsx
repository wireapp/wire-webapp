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

import {Availability} from '@wireapp/protocol-messaging';

import {UserInfo} from './UserInfo';

import {User} from '../entity/User';

const user = new User();

const defaultProps = {
  dataUieName: 'example-data-uie',
  user,
  label: 'example',
  theme: false,
  showAvailability: true,
};

describe('UserInfo', () => {
  it('renders available icon', async () => {
    user.availability(Availability.Type.AVAILABLE);
    const {getByTestId} = render(<UserInfo {...defaultProps} />);

    const statusAvailabilityIcon = getByTestId('status-availability-icon');
    expect(statusAvailabilityIcon.getAttribute('data-uie-value')).toEqual('available');
  });

  it('renders away icon', async () => {
    user.availability(Availability.Type.AWAY);

    const {getByTestId} = render(<UserInfo {...defaultProps} />);

    const statusAvailabilityIcon = getByTestId('status-availability-icon');
    expect(statusAvailabilityIcon.getAttribute('data-uie-value')).toEqual('away');
  });

  it('renders busy icon', async () => {
    user.availability(Availability.Type.BUSY);

    const {getByTestId} = render(<UserInfo {...defaultProps} />);

    const statusAvailabilityIcon = getByTestId('status-availability-icon');
    expect(statusAvailabilityIcon.getAttribute('data-uie-value')).toEqual('busy');
  });

  it('does not show availability icon if param is false', async () => {
    user.availability(Availability.Type.AVAILABLE);
    const {queryByTestId} = render(<UserInfo {...defaultProps} showAvailability={false} />);

    const statusAvailabilityIcon = queryByTestId('status-availability-icon');
    expect(statusAvailabilityIcon).toBeNull();
  });
});
