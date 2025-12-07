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

import {render, fireEvent} from '@testing-library/react';
import {CopyIcon, EditIcon, PickupIcon} from 'Components/Icon';

import {PanelActions, MenuItem} from './PanelActions';

describe('PanelActions', () => {
  it('displays a single action', () => {
    const items: MenuItem[] = [{click: () => {}, Icon: EditIcon, identifier: 'testIdentifier', label: 'testLabel'}];
    const itemSpy = jest.spyOn(items[0], 'click');

    const {getByTestId, queryByText} = render(<PanelActions items={items} />);

    const mainAction = getByTestId(items[0].identifier);

    expect(queryByText(items[0].label)).not.toBeNull();
    expect(mainAction).not.toBeNull();

    fireEvent.click(mainAction);
    expect(itemSpy).toHaveBeenCalled();
  });

  it('displays more than one action', () => {
    const items: MenuItem[] = [
      {click: () => {}, Icon: CopyIcon, identifier: 'mainIdentifier', label: 'mainLabel'},
      {click: () => {}, Icon: PickupIcon, identifier: 'secondaryIdentifier', label: 'secondaryLabel'},
    ];

    const {queryByText, getByTestId} = render(<PanelActions items={items} />);

    expect(queryByText(items[0].label)).not.toBeNull();

    expect(getByTestId(items[0].identifier)).not.toBeNull();

    expect(getByTestId(items[1].identifier)).not.toBeNull();
  });
});
