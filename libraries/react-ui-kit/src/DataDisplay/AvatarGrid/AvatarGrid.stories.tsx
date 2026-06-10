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

import {AvatarGrid} from './AvatarGrid';

import {COLOR} from '../../Identity/colors/colors';

const meta: Meta<typeof AvatarGrid> = {
  component: AvatarGrid,
  title: 'DataDisplay/AvatarGrid',
  argTypes: {
    backgroundColor: {control: 'color'},
    borderColor: {control: 'color'},
    borderWidth: {control: {type: 'number', min: 0, max: 4, step: 1}},
    size: {control: {type: 'number', min: 32, max: 256, step: 8}},
  },
};

export default meta;
type Story = StoryObj<typeof AvatarGrid>;

export const Default: Story = {
  args: {
    size: 120,
    items: [
      {color: COLOR.RED, name: 'Joe Doe'},
      {color: COLOR.BLUE, name: 'Bon Jovi'},
      {color: COLOR.ORANGE, name: 'Mick Jagger'},
      {color: COLOR.GREEN, name: 'Freddy Mercury'},
    ],
  },
};

export const WithImages: Story = {
  args: {
    size: 120,
    items: [
      {
        color: COLOR.RED,
        name: 'Joe Doe',
        url: 'https://wire.com/hs-fs/hubfs/images%202024/about-us-hero-min.jpg?width=200&height=200',
      },
      {color: COLOR.BLUE, name: 'Bon Jovi'},
      {
        color: COLOR.ORANGE,
        name: 'Mick Jagger',
        url: 'https://wire.com/hs-fs/hubfs/images%202024/about-us-hero-min.jpg?width=200&height=200',
      },
      {color: COLOR.GREEN, name: 'Freddy Mercury'},
    ],
  },
};

export const CustomStyle: Story = {
  args: {
    backgroundColor: COLOR.BLUE,
    borderColor: COLOR.WHITE,
    borderWidth: 2,
    size: 120,
    items: [
      {color: COLOR.RED, name: 'Joe Doe'},
      {color: COLOR.YELLOW, name: 'Bon Jovi'},
      {color: COLOR.ORANGE, name: 'Mick Jagger'},
    ],
  },
};

export const TwoItems: Story = {
  args: {
    size: 64,
    items: [
      {color: COLOR.ORANGE, name: 'Mick Jagger'},
      {color: COLOR.BLUE, name: 'Freddy Mercury'},
    ],
  },
};

export const SingleItem: Story = {
  args: {
    size: 64,
    items: [{color: COLOR.ORANGE, name: 'Mick Jagger'}],
  },
};

export const MultipleSizes: Story = {
  render: () => (
    <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
      <AvatarGrid
        size={32}
        items={[
          {color: COLOR.RED, name: 'Joe'},
          {color: COLOR.BLUE, name: 'Bon'},
        ]}
      />
      <AvatarGrid
        size={64}
        items={[
          {color: COLOR.RED, name: 'Joe'},
          {color: COLOR.BLUE, name: 'Bon'},
          {color: COLOR.GREEN, name: 'Fred'},
        ]}
      />
      <AvatarGrid
        size={96}
        items={[
          {color: COLOR.RED, name: 'Joe'},
          {color: COLOR.BLUE, name: 'Bon'},
          {color: COLOR.GREEN, name: 'Fred'},
          {color: COLOR.ORANGE, name: 'Mick'},
        ]}
      />
    </div>
  ),
};
