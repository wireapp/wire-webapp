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

import {Title} from './Title';

import {COLOR} from '../../Identity';

const meta = {
  title: 'Typography/Title',
  component: Title,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'color',
    },
    fontSize: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Title>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Title',
  },
};

export const CustomColor: Story = {
  args: {
    children: 'Colored Title',
    color: COLOR.RED,
  },
};

export const CustomSize: Story = {
  args: {
    children: 'Custom Size Title',
    fontSize: '3rem',
  },
};

export const NotCentered: Story = {
  args: {
    children: 'Left-aligned Title',
    center: false,
  },
};
