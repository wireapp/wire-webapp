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

import {CodeInput} from './CodeInput';

const meta = {
  title: 'Inputs/CodeInput',
  component: CodeInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // eslint-disable-next-line no-console
    onCodeComplete: code => console.log('Code entered:', code),
  },
};

export const Invalid: Story = {
  args: {
    markInvalid: true,
    // eslint-disable-next-line no-console
    onCodeComplete: code => console.log('Code entered:', code),
  },
};

export const CustomLength: Story = {
  args: {
    digits: 4,
    // eslint-disable-next-line no-console
    onCodeComplete: code => console.log('Code entered:', code),
  },
};
