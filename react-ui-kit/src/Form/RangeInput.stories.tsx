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

import {RangeInput} from './RangeInput';

const meta = {
  title: 'Form/RangeInput',
  component: RangeInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: 50,
    min: 0,
    max: 100,
  },
};

export const WithSteps: Story = {
  args: {
    defaultValue: 5,
    min: 0,
    max: 10,
    step: 1,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 50,
    min: 0,
    max: 100,
    disabled: true,
  },
};

export const CustomRange: Story = {
  args: {
    defaultValue: 0,
    min: -50,
    max: 50,
    step: 10,
  },
};
