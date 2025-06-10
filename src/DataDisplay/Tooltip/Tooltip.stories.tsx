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

import {Tooltip} from './Tooltip';

import {Button} from '../../Inputs/Button/Button';
import {Input} from '../../Inputs/Input/Input';

const meta = {
  title: 'DataDisplay/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div id="wire-app" style={{position: 'relative', minHeight: '200px', padding: '24px'}}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    body: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
};

export const WithInput: Story = {
  args: {
    body: 'Enter your username',
    children: <Input placeholder="Username" />,
  },
};

export const CustomPosition: Story = {
  args: {
    body: 'Tooltip on the right',
    children: <Button>Hover me</Button>,
  },
};

export const LongContent: Story = {
  args: {
    body: 'This is a longer tooltip that might wrap to multiple lines. It contains more detailed information about the element.',
    children: <Button>Hover for more info</Button>,
  },
};

export const WithMarkup: Story = {
  args: {
    body: (
      <div>
        <strong>Bold text</strong>
        <br />
        <em>Italic text</em>
        <br />
        Regular text
      </div>
    ),
    children: <Button>Hover for formatted tooltip</Button>,
  },
};
