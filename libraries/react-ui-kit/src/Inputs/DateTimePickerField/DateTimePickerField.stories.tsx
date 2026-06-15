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

import {DateTimePickerField} from './DateTimePickerField';
import {getNextHourDateTime} from './dateTimeUtils';

const defaultLabels = {
  dateAriaLabel: 'Select date',
  timeAriaLabel: 'Select time',
  openCalendarLabel: 'Open calendar',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
};

const meta = {
  title: 'Inputs/DateTimePickerField',
  component: DateTimePickerField,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div style={{width: '420px'}}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof DateTimePickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledDateTimePicker = (args: React.ComponentProps<typeof DateTimePickerField>) => {
  const [value, setValue] = useState<Date | null>(args.value ?? getNextHourDateTime());

  return <DateTimePickerField {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: args => <ControlledDateTimePicker {...args} />,
  args: {
    dataUieName: 'datetime-picker-default',
    labels: defaultLabels,
    value: getNextHourDateTime(),
    onChange: () => undefined,
  },
};

export const WithLabel: Story = {
  render: args => <ControlledDateTimePicker {...args} />,
  args: {
    dataUieName: 'datetime-picker-with-label',
    label: 'Starts at',
    labels: defaultLabels,
    value: getNextHourDateTime(),
    onChange: () => undefined,
  },
};

export const Invalid: Story = {
  render: args => <ControlledDateTimePicker {...args} />,
  args: {
    dataUieName: 'datetime-picker-invalid',
    label: 'Starts at',
    labels: defaultLabels,
    markInvalid: true,
    errorText: 'Please select a future date and time.',
    value: getNextHourDateTime(),
    onChange: () => undefined,
  },
};

export const Disabled: Story = {
  render: args => <ControlledDateTimePicker {...args} />,
  args: {
    dataUieName: 'datetime-picker-disabled',
    label: 'Starts at',
    labels: defaultLabels,
    disabled: true,
    value: getNextHourDateTime(),
    onChange: () => undefined,
  },
};
