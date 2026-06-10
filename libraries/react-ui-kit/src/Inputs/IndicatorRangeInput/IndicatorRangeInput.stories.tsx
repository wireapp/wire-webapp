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

import {IndicatorRangeInput} from './IndicatorRangeInput';

const dataListOptions = [
  {value: 10, label: '10px', heading: 'Small'},
  {value: 12, label: '12px'},
  {value: 14, label: '14px'},
  {value: 16, label: '16px', heading: 'Default'},
  {value: 18, label: '18px'},
  {value: 20, label: '20px'},
  {value: 24, label: '24px', heading: 'Large'},
];

const meta = {
  title: 'Inputs/IndicatorRangeInput',
  component: IndicatorRangeInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IndicatorRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Font size',
    value: 3,
    dataListOptions,
    // eslint-disable-next-line no-console
    onChange: event => console.log('Value changed:', event.currentTarget.value),
    // eslint-disable-next-line no-console
    onOptionClick: value => console.log('Option clicked:', value),
  },
};
