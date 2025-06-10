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

import {Heading, H1, H2, H3, H4} from './Heading';

const meta = {
  title: 'Typography/Heading',
  component: Heading,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: ['1', '2', '3', '4'],
      description: 'Heading level (1-4)',
    },
    color: {
      control: 'color',
      description: 'Text color',
    },
    noWrap: {
      control: 'boolean',
      description: 'Prevent text from wrapping',
    },
    textTransform: {
      control: 'select',
      options: ['none', 'uppercase', 'lowercase', 'capitalize'],
      description: 'Text transformation',
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Heading',
  },
};

export const AllHeadingLevels: Story = {
  render: () => (
    <div>
      <H1>Heading Level 1</H1>
      <H2>Heading Level 2</H2>
      <H3>Heading Level 3</H3>
      <H4>Heading Level 4</H4>
    </div>
  ),
};

export const WithCustomColor: Story = {
  args: {
    children: 'Colored Heading',
    color: '#2391d3',
  },
};

export const NoWrapHeading: Story = {
  args: {
    children: 'This is a very long heading that should not wrap to the next line',
    noWrap: true,
  },
};

export const TransformedText: Story = {
  args: {
    children: 'Uppercase heading',
    textTransform: 'uppercase',
  },
};

// Example with a long text to demonstrate wrapping behavior
export const LongText: Story = {
  args: {
    children:
      'This is a very long heading that demonstrates how the text wraps when it exceeds the container width. It should automatically wrap to multiple lines.',
    level: '2',
  },
};
