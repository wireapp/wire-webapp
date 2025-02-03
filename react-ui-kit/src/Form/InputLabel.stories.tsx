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

import {Input} from './Input';
import {InputLabel} from './InputLabel';

const meta = {
  title: 'Form/InputLabel',
  component: InputLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label Text',
  },
};

export const WithInput: Story = {
  args: {
    children: 'Email address',
    htmlFor: 'example-input',
  },
  decorators: [
    Story => (
      <div>
        <Story />
        <Input id="example-input" type="email" placeholder="Enter email" />
      </div>
    ),
  ],
};

export const Invalid: Story = {
  args: {
    children: 'Invalid Label',
    markInvalid: true,
  },
};
