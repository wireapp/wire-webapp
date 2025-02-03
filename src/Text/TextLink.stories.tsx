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

import {Text} from './Text';
import {TextLink} from './TextLink';

import {COLOR_V2} from '../Identity/colors-v2';

const meta = {
  title: 'Typography/TextLink',
  component: TextLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'color',
    },
  },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default TextLink',
    href: '#',
  },
};

export const InText: Story = {
  render: () => (
    <Text>
      This is a paragraph with a <TextLink href="#">text link</TextLink> inside.
    </Text>
  ),
};

export const CustomColor: Story = {
  args: {
    children: 'Custom Color Link',
    color: COLOR_V2.RED,
    href: '#',
  },
};
