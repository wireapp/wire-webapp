/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import {useState} from 'react';

import {TimePickerField} from './TimePickerField';
import {buildTimeOptions} from './timePickerUtils';

import {Option} from '../Select';

const timeOptions = buildTimeOptions();

const meta = {
  title: 'Inputs/TimePickerField',
  component: TimePickerField,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div style={{width: '350px'}}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof TimePickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledTimePicker = (args: React.ComponentProps<typeof TimePickerField>) => {
  const [value, setValue] = useState<Option | null>(args.value ?? timeOptions[0]);

  return <TimePickerField {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: args => <ControlledTimePicker {...args} />,
  args: {
    id: 'time-picker-default',
    dataUieName: 'time-picker-default',
    ariaLabel: 'Select time',
    value: timeOptions[0],
    onChange: () => undefined,
  },
};

export const WithLabel: Story = {
  render: args => <ControlledTimePicker {...args} />,
  args: {
    id: 'time-picker-with-label',
    dataUieName: 'time-picker-with-label',
    label: 'Time',
    value: timeOptions[0],
    onChange: () => undefined,
  },
};

export const Invalid: Story = {
  render: args => <ControlledTimePicker {...args} />,
  args: {
    id: 'time-picker-invalid',
    dataUieName: 'time-picker-invalid',
    label: 'Time',
    markInvalid: true,
    value: timeOptions[0],
    onChange: () => undefined,
  },
};

export const Disabled: Story = {
  render: args => <ControlledTimePicker {...args} />,
  args: {
    id: 'time-picker-disabled',
    dataUieName: 'time-picker-disabled',
    label: 'Time',
    disabled: true,
    value: timeOptions[0],
    onChange: () => undefined,
  },
};
