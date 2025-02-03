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

import {Label, LabelLink} from './Label';
import {Text} from './Text';

import {Input} from '../Form';

const meta = {
  title: 'Typography/Label',
  component: Label,
  subcomponents: {LabelLink, Input, Text},
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div style={{minWidth: '600px'}}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Label',
  },
};

export const WithInput: Story = {
  render: () => (
    <Label>
      <Text style={{marginLeft: '16px', marginBottom: '8px', display: 'block'}}>Input Label</Text>
      <Input placeholder="Type something..." />
    </Label>
  ),
};

export const InvalidLabel: Story = {
  args: {
    children: 'Invalid Label',
    markInvalid: true,
  },
};

export const LabelLinkStory: Story = {
  render: () => <LabelLink>Click me</LabelLink>,
};
