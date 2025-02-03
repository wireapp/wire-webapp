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

import {InputLabel} from './InputLabel';
import {TextArea} from './TextArea';

const meta = {
  title: 'Form/TextArea',
  component: TextArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div>
      <InputLabel htmlFor="textarea-example">Message</InputLabel>
      <TextArea id="textarea-example" placeholder="Type your message here..." />
    </div>
  ),
};

export const Invalid: Story = {
  args: {
    placeholder: 'Invalid input...',
    markInvalid: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea...',
    disabled: true,
  },
};
