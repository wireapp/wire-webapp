/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import type {Meta, StoryObj} from '@storybook/react';

import {ComboboxSelect} from './ComboboxSelect';

const options = [
  {value: '1', label: 'Option 1'},
  {value: '2', label: 'Option 2'},
  {value: '3', label: 'Option 3'},
  {value: '4', label: 'Option 4'},
  {value: '5', label: 'Option 5'},
  {value: '6', label: 'Option 6'},
  {value: '7', label: 'Option 7'},
];

const meta = {
  title: 'Form/ComboboxSelect',
  component: ComboboxSelect,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div style={{width: '476px'}}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ComboboxSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'default-select',
    options,
    placeholder: 'Select options...',
    dataUieName: 'default-select',
  },
};

export const WithValue: Story = {
  args: {
    id: 'with-value-select',
    options,
    value: [options[0], options[1]],
    placeholder: 'Select options...',
    dataUieName: 'with-value-select',
  },
};

export const Disabled: Story = {
  args: {
    id: 'disabled-select',
    options,
    isDisabled: true,
    placeholder: 'Select options...',
    dataUieName: 'disabled-select',
  },
};

export const Creatable: Story = {
  args: {
    id: 'creatable-select',
    options,
    placeholder: 'Select or create options...',
    dataUieName: 'creatable-select',
  },
};

export const WithLabel: Story = {
  args: {
    id: 'with-label-select',
    label: 'Select options',
    options,
  },
};
