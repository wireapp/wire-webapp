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

import {Meta, StoryObj} from '@storybook/react';

import {Avatar} from './Avatar';
import {COLOR} from './colors';

const meta: Meta<typeof Avatar> = {
  component: Avatar,
  title: 'Identity/Avatar',
  argTypes: {
    backgroundColor: {control: 'color'},
    borderColor: {control: 'color'},
    size: {control: {type: 'number', min: 16, max: 128, step: 4}},
    name: {control: 'text'},
    url: {control: 'text'},
    forceInitials: {control: 'boolean'},
    isAvatarGridItem: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithInitials: Story = {
  args: {
    name: 'John Doe',
    size: 48,
  },
};

export const WithImage: Story = {
  args: {
    name: 'John Doe',
    size: 48,
    url: 'https://wire.com/hs-fs/hubfs/images%202024/about-us-hero-min.jpg?width=2175&height=2043&name=about-us-hero-min.jpg',
  },
};

export const CustomColors: Story = {
  args: {
    backgroundColor: COLOR.BLUE,
    borderColor: COLOR.WHITE,
    name: 'Jane Smith',
    size: 48,
  },
};

export const Small: Story = {
  args: {
    name: 'JS',
    size: 24,
  },
};

export const Large: Story = {
  args: {
    name: 'Jane Smith',
    size: 96,
  },
};

export const ForcedInitials: Story = {
  args: {
    forceInitials: true,
    name: 'John Doe',
    size: 48,
    url: 'https://placekitten.com/200/200',
  },
};

export const MultipleSizes: Story = {
  render: () => (
    <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
      <Avatar name="John Doe" size={24} />
      <Avatar name="John Doe" size={32} />
      <Avatar name="John Doe" size={48} />
      <Avatar name="John Doe" size={64} />
      <Avatar name="John Doe" size={96} />
    </div>
  ),
};
