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

import {Link, LinkVariant} from './Link';

import {COLOR} from '../../Identity';

const meta = {
  title: 'Typography/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(LinkVariant),
    },
    color: {
      control: 'color',
    },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Link',
    href: '#',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Link',
    variant: LinkVariant.PRIMARY,
    href: '#',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Link',
    variant: LinkVariant.SECONDARY,
    href: '#',
  },
};

export const CustomColor: Story = {
  args: {
    children: 'Colored Link',
    color: COLOR.RED,
    href: '#',
  },
};

export const ExternalLink: Story = {
  args: {
    children: 'External Link',
    href: 'https://wire.com',
    targetBlank: true,
  },
};
