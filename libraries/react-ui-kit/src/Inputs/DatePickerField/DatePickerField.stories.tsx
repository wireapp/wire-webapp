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
import {DateValue, getLocalTimeZone, today} from '@internationalized/date';
import {useState} from 'react';

import {DatePickerField} from './DatePickerField';

const defaultLabels = {
  openCalendarLabel: 'Open calendar',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
};

const meta = {
  title: 'Inputs/DatePickerField',
  component: DatePickerField,
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
} satisfies Meta<typeof DatePickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledDatePicker = (args: React.ComponentProps<typeof DatePickerField>) => {
  const [value, setValue] = useState<DateValue | null>(args.value ?? today(getLocalTimeZone()));

  return <DatePickerField {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: args => <ControlledDatePicker {...args} />,
  args: {
    dataUieName: 'date-picker-default',
    id: 'date-picker-default',
    labels: defaultLabels,
    ariaLabel: 'Select date',
    value: today(getLocalTimeZone()),
    onChange: () => undefined,
  },
};

export const WithLabel: Story = {
  render: args => <ControlledDatePicker {...args} />,
  args: {
    dataUieName: 'date-picker-with-label',
    id: 'date-picker-with-label',
    label: 'Date',
    labels: defaultLabels,
    value: today(getLocalTimeZone()),
    onChange: () => undefined,
  },
};

export const Invalid: Story = {
  render: args => <ControlledDatePicker {...args} />,
  args: {
    dataUieName: 'date-picker-invalid',
    id: 'date-picker-invalid',
    label: 'Date',
    labels: defaultLabels,
    markInvalid: true,
    value: today(getLocalTimeZone()),
    onChange: () => undefined,
  },
};

export const Disabled: Story = {
  render: args => <ControlledDatePicker {...args} />,
  args: {
    dataUieName: 'date-picker-disabled',
    id: 'date-picker-disabled',
    label: 'Date',
    labels: defaultLabels,
    disabled: true,
    value: today(getLocalTimeZone()),
    onChange: () => undefined,
  },
};
