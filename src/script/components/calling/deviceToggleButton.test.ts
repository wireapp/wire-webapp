/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {instantiateComponent} from '../../../../test/helper/knockoutHelpers';
import './deviceToggleButton';

describe('deviceToggleButton', () => {
  it('shows the available devices and highlight the current active device', () => {
    const devices = ['first', 'second'];
    const params = {
      currentDevice: ko.observable(devices[0]),
      devices: ko.observable(devices),
      onChooseDevice: () => {},
    };

    return instantiateComponent('device-toggle-button', params).then((domContainer: Element) => {
      const dots = domContainer.querySelectorAll('.device-toggle-button-indicator-dot');

      expect(dots.length).toBe(devices.length);
      const activeDot = domContainer.querySelector('.device-toggle-button-indicator-dot-active');

      expect(activeDot).not.toBe(null);
    });
  });

  it('switches to next device when clicked', () => {
    const devices = ['first', 'second'];
    const params = {
      currentDevice: ko.observable(devices[0]),
      devices: ko.observable(devices),
      onChooseDevice: jasmine.createSpy('chooseDevice'),
    };

    return instantiateComponent('device-toggle-button', params).then((domContainer: Element) => {
      const button = domContainer.querySelector('.device-toggle-button-indicator') as HTMLButtonElement;
      if (!button) {
        fail('button was not found');
      }
      button.click();

      expect(params.onChooseDevice).toHaveBeenCalled();
    });
  });
});
