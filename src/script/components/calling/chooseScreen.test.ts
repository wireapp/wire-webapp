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
import './chooseScreen';

describe('chooseScreen', () => {
  it('shows the available screens', async () => {
    const screens = [
      {id: 'screen:first', thumbnail: {toDataURL: () => 'first screen'}},
      {id: 'screen:second', thumbnail: {toDataURL: () => 'second screen'}},
    ];
    const windows = [
      {id: 'window:first', thumbnail: {toDataURL: () => 'first window'}},
      {id: 'window:second', thumbnail: {toDataURL: () => 'second window'}},
    ];
    const params = {
      cancel: () => {},
      choose: () => {},
      screens: ko.observable(screens),
      windows: ko.observable(windows),
    };

    window.t = jest.fn().mockImplementation((value: string) => value);

    const domContainer = await instantiateComponent('choose-screen', params);
    const screenItems = domContainer.querySelectorAll('.choose-screen-list-item');
    expect(screenItems.length).toBe(screens.length + windows.length);
  });
});
