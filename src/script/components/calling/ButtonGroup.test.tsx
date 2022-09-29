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

import ButtonGroup from './ButtonGroup';
import {render, fireEvent} from '@testing-library/react';

describe('ButtonGroup', () => {
  const items = [
    {getText: () => 'one', value: 'one'},
    {getText: () => 'two', value: 'two'},
  ];

  it('renders buttons', async () => {
    const {container} = render(<ButtonGroup currentItem="one" items={items} onChangeItem={() => {}} />);

    const wrapper = container.querySelector('[data-uie-name="button-group-wrapper"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper!.children.length).toBe(2);
  });

  it('runs onChangeItem callback on inactive item click', async () => {
    const onChangeItem = jest.fn();

    const props = {
      currentItem: 'one',
      items,
      onChangeItem,
    };

    const {container} = render(<ButtonGroup {...props} />);
    const inactiveItem = container.querySelector('button[data-uie-value="inactive"]');

    expect(inactiveItem).not.toBeNull();
    fireEvent.click(inactiveItem!);

    expect(onChangeItem).toHaveBeenCalledWith('two');
  });

  it('does not trigger onChangeItem on active buttons click', () => {
    const onChangeItem = jest.fn();

    const props = {
      currentItem: 'one',
      items,
      onChangeItem,
    };

    const {container} = render(<ButtonGroup {...props} />);

    const activeItem = container.querySelector('button[data-uie-value="active"]');
    expect(activeItem).not.toBeNull();
    fireEvent.click(activeItem!);

    expect(onChangeItem).not.toHaveBeenCalled();
  });
});
