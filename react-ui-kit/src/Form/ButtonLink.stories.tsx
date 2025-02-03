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

import {ButtonLink} from './ButtonLink';

import {COLOR} from '../Identity';

const meta = {
  title: 'Form/ButtonLink',
  component: ButtonLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button Link',
    href: '#',
  },
};

export const CustomColor: Story = {
  args: {
    children: 'Colored Button Link',
    backgroundColor: COLOR.GREEN,
    href: '#',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading Button Link',
    showLoading: true,
    href: '#',
  },
};
