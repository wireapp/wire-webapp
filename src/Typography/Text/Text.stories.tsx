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

import {Text, Bold, Small, Muted, Uppercase, Large} from './Text';

import {COLOR} from '../../Identity';

const meta = {
  title: 'Typography/Text',
  component: Text,
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
    textTransform: {
      control: 'select',
      options: ['none', 'uppercase', 'lowercase', 'capitalize'],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Text',
  },
};

export const BoldText: Story = {
  render: () => <Bold>Bold Text</Bold>,
};

export const SmallText: Story = {
  render: () => <Small>Small Text</Small>,
};

export const MutedText: Story = {
  render: () => <Muted>Muted Text</Muted>,
};

export const UppercaseText: Story = {
  render: () => <Uppercase>Uppercase Text</Uppercase>,
};

export const LargeText: Story = {
  render: () => <Large>Large Text</Large>,
};

export const ColoredText: Story = {
  args: {
    children: 'Colored Text',
    color: COLOR.RED,
  },
};

export const CustomFontSize: Story = {
  args: {
    children: 'Custom Size Text',
    fontSize: '24px',
  },
};
