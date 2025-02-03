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

import {Box} from './Box';

import {COLOR} from '../Identity/colors';
import {Text} from '../Text';

const meta: Meta<typeof Box> = {
  component: Box,
  title: 'Layout/Box',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Box>;

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce a mattis nibh, sed maximus leo. Fusce a lacinia sem,
vitae ornare dolor. Quisque rhoncus, magna non lacinia sagittis, erat augue fringilla metus, eu consectetur leo velit
non lacus. Phasellus ipsum turpis, dapibus ut purus in, lobortis consectetur mi.`;

export const Default: Story = {
  args: {
    children: LOREM_IPSUM,
  },
};

export const WithCustomPadding: Story = {
  args: {
    children: LOREM_IPSUM,
    style: {padding: '32px'},
  },
};

export const WithCustomBorder: Story = {
  args: {
    children: LOREM_IPSUM,
    style: {border: `2px solid ${COLOR.BLUE}`},
  },
};

export const WithFormattedContent: Story = {
  args: {
    children: (
      <>
        <Text block style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>
          Important Notice
        </Text>
        <Text block style={{marginBottom: '12px'}}>
          {LOREM_IPSUM}
        </Text>
        <Text block style={{color: COLOR.GRAY}}>
          Last updated: 2025-01-01
        </Text>
      </>
    ),
  },
};

export const Nested: Story = {
  args: {
    children: (
      <>
        <Text block style={{marginBottom: '16px'}}>
          Outer box content
        </Text>
        <Box style={{backgroundColor: COLOR.GRAY_LIGHTEN_92}}>
          <Text>Inner box content</Text>
        </Box>
      </>
    ),
  },
};

export const Interactive: Story = {
  args: {
    children: (
      <div style={{textAlign: 'center'}}>
        <Text block style={{marginBottom: '16px'}}>
          Click the button below
        </Text>
        <button
          style={{
            backgroundColor: COLOR.BLUE,
            border: 'none',
            borderRadius: '4px',
            color: COLOR.WHITE,
            cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Action Button
        </button>
      </div>
    ),
    style: {cursor: 'pointer'},
  },
};
