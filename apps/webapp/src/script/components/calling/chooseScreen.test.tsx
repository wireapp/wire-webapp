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

import {render, fireEvent} from '@testing-library/react';
import {container} from 'tsyringe';

import {CallState} from 'Repositories/calling/CallState';

import {ChooseScreen} from './ChooseScreen';

describe('ChooseScreen', () => {
  const screens = [
    {id: 'screen:first', name: 'Screen 1', thumbnail: {toDataURL: () => 'first screen'} as HTMLCanvasElement},
    {id: 'screen:second', name: 'Screen 2', thumbnail: {toDataURL: () => 'second screen'} as HTMLCanvasElement},
  ];
  const windows = [
    {id: 'window:first', name: 'Window 1', thumbnail: {toDataURL: () => 'first window'} as HTMLCanvasElement},
    {id: 'window:second', name: 'Window 2', thumbnail: {toDataURL: () => 'second window'} as HTMLCanvasElement},
  ];

  const props = {
    choose: jest.fn(),
  };

  const callState = container.resolve(CallState);

  beforeEach(() => {
    callState.selectableScreens(screens as any);
    callState.selectableWindows(windows as any);
  });

  it('shows the available screens', () => {
    const {container} = render(<ChooseScreen {...props} />);
    const screenItems = container.querySelectorAll('[data-uie-name="item-screen"]');
    const windowItems = container.querySelectorAll('[data-uie-name="item-window"]');

    expect(screenItems).toHaveLength(screens.length);
    expect(windowItems).toHaveLength(windows.length);
  });

  it('calls cancel on escape', () => {
    render(<ChooseScreen {...props} />);

    fireEvent.keyDown(document, {code: 'Enter', key: 'Escape'});
    expect(callState.selectableScreens()).toEqual([]);
    expect(callState.selectableWindows()).toEqual([]);
  });

  it('calls cancel on cancel button click', () => {
    const {container} = render(<ChooseScreen {...props} />);

    const cancelButton = container.querySelector('[data-uie-name="do-choose-screen-cancel"]');
    expect(cancelButton).not.toBeNull();

    fireEvent.click(cancelButton!);
    expect(callState.selectableScreens()).toEqual([]);
    expect(callState.selectableWindows()).toEqual([]);
  });

  it('chooses the correct screens on click', () => {
    const {container} = render(<ChooseScreen {...props} />);

    const ids = [...screens, ...windows].map(({id}) => id);

    const screenItems = container.querySelectorAll('[data-uie-name="item-screen"]');
    const windowItems = container.querySelectorAll('[data-uie-name="item-window"]');

    const allItems = [...screenItems, ...windowItems];

    allItems.forEach((listItem, index) => {
      fireEvent.click(listItem);
      expect(props.choose).toHaveBeenCalledWith(ids[index]);
    });
  });
});
