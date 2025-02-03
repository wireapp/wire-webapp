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

import {Paragraph, Lead} from './Paragraph';

const meta = {
  title: 'Typography/Paragraph',
  component: Paragraph,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Paragraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;

export const Default: Story = {
  args: {
    children: LOREM_IPSUM,
  },
};

export const TruncatedParagraph: Story = {
  args: {
    children: LOREM_IPSUM,
    noWrap: true,
    truncate: true,
  },
};

export const LeadParagraph: Story = {
  render: () => <Lead>{LOREM_IPSUM}</Lead>,
};
