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

import {BadgesWithTooltip} from './BadgesWithTooltip';

const meta = {
  title: 'DataDisplay/BadgesWithTooltip',
  component: BadgesWithTooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div
        id="wire-app"
        style={{
          position: 'relative',
          minHeight: '200px',
          padding: '24px',
          maxWidth: '300px',
          margin: '0 auto',
          background: 'white',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BadgesWithTooltip>;

export default meta;
type Story = StoryObj<typeof BadgesWithTooltip>;

export const SingleItem: Story = {
  args: {
    items: ['Admin'],
  },
};

export const TwoItems: Story = {
  args: {
    items: ['Admin', 'Moderator'],
  },
};

export const MultipleItems: Story = {
  args: {
    items: ['Admin', 'Moderator', 'User', 'Guest'],
  },
};

export const LongItems: Story = {
  args: {
    items: ['Administrator', 'Super Moderator', 'Power User', 'Regular User', 'Guest User'],
  },
};
