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

import {useState} from 'react';

import type {Meta, StoryObj} from '@storybook/react';

import {ComboboxSelect, type ComboboxSelectProps} from './ComboboxSelect';

import type {Option} from '../Select';

const initialOptions: Option[] = [
  {value: '1', label: 'Option 1'},
  {value: '2', label: 'Option 2'},
  {value: '3', label: 'Option 3'},
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
    options: initialOptions,
    placeholder: 'Select options...',
    dataUieName: 'default-select',
    createOptionLabel: inputValue => `Create item "${inputValue}"`,
    onCreateOption: () => {},
    noOptionsMessage: 'No options available',
  },
};

export const WithValue: Story = {
  args: {
    id: 'with-value-select',
    options: initialOptions,
    value: [initialOptions[0], initialOptions[1]],
    placeholder: 'Select options...',
    dataUieName: 'with-value-select',
    createOptionLabel: inputValue => `Create item "${inputValue}"`,
    onCreateOption: () => {},
    noOptionsMessage: 'No options available',
  },
};

export const Disabled: Story = {
  args: {
    id: 'disabled-select',
    options: initialOptions,
    isDisabled: true,
    placeholder: 'Select options...',
    dataUieName: 'disabled-select',
    createOptionLabel: inputValue => `Create item "${inputValue}"`,
    onCreateOption: () => {},
    noOptionsMessage: 'No options available',
  },
};

const CreatableSelectWrapper = (args: ComboboxSelectProps) => {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [selectedValue, setSelectedValue] = useState<Option[]>([]);

  const handleCreateOption = (inputValue: string) => {
    const newOption = {
      value: inputValue.toLowerCase().replace(/\W/g, ''),
      label: inputValue,
    };
    setOptions(prev => [...prev, newOption]);
    setSelectedValue(prev => [...prev, newOption]);
  };

  const handleChange = (value: Option | Option[]) => {
    setSelectedValue(Array.isArray(value) ? value : [value]);
  };

  return (
    <ComboboxSelect
      {...args}
      options={options}
      value={selectedValue}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
    />
  );
};

export const Creatable: Story = {
  args: {
    id: 'creatable-select',
    options: initialOptions,
    placeholder: 'Select or create options...',
    dataUieName: 'creatable-select',
    createOptionLabel: inputValue => `Create item "${inputValue}"`,
    onCreateOption: () => {},
    noOptionsMessage: 'No options available',
    required: true,
  },
  render: args => <CreatableSelectWrapper {...args} />,
};

export const WithLabel: Story = {
  args: {
    id: 'with-label-select',
    label: 'Select options',
    options: initialOptions,
    createOptionLabel: inputValue => `Create item "${inputValue}"`,
    onCreateOption: () => {},
    noOptionsMessage: 'No options available',
  },
};
