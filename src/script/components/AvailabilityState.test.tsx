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

import {Availability} from '@wireapp/protocol-messaging';
import TestPage from 'Util/test/TestPage';
import AvailabilityState, {AvailabilityStateProps} from './AvailabilityState';

class AvailabilityStatePage extends TestPage<AvailabilityStateProps> {
  constructor(props?: AvailabilityStateProps) {
    super(AvailabilityState, props);
  }

  getAvailableIcon = () => this.get('svg[data-uie-value="available"]');
  getAwayIcon = () => this.get('svg[data-uie-value="away"]');
  getBusyIcon = () => this.get('svg[data-uie-value="busy"]');
  getArrow = () => this.get('span[data-uie-name="availability-arrow"]');
}

describe('AvailabilityState', () => {
  it('renders available icon', async () => {
    const availabilityState = new AvailabilityStatePage({
      availability: Availability.Type.AVAILABLE,
      label: 'example',
      showArrow: false,
      theme: false,
    });

    expect(availabilityState.getAvailableIcon().exists()).toBe(true);
  });

  it('renders away icon', async () => {
    const availabilityState = new AvailabilityStatePage({
      availability: Availability.Type.AWAY,
      label: 'example',
      showArrow: false,
      theme: false,
    });

    expect(availabilityState.getAwayIcon().exists()).toBe(true);
  });

  it('renders busy icon', async () => {
    const availabilityState = new AvailabilityStatePage({
      availability: Availability.Type.BUSY,
      label: 'example',
      showArrow: false,
      theme: false,
    });

    expect(availabilityState.getBusyIcon().exists()).toBe(true);
  });

  it('renders availability icon with arrow', async () => {
    const availabilityState = new AvailabilityStatePage({
      availability: Availability.Type.BUSY,
      label: 'example',
      showArrow: true,
      theme: false,
    });

    expect(availabilityState.getBusyIcon().exists()).toBe(true);
    expect(availabilityState.getArrow().exists()).toBe(true);
  });
});
