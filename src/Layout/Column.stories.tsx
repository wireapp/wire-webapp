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

import {ReactNode} from 'react';

import {Meta, StoryObj} from '@storybook/react';

import {Column, Columns} from './Column';

import {COLOR} from '../Identity/colors';
import {QueryKeys} from '../mediaQueries';

const meta: Meta<typeof Columns> = {
  component: Columns,
  title: 'Layout/Column',
};

export default meta;
type Story = StoryObj<typeof Columns>;

const Box = ({children}: {children: ReactNode}) => (
  <div
    style={{
      backgroundColor: COLOR.GRAY_LIGHTEN_72,
      border: `1px solid ${COLOR.GRAY_LIGHTEN_48}`,
      borderRadius: '4px',
      padding: '16px',
      textAlign: 'center',
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <Column>
          <Box>Column 1</Box>
        </Column>
        <Column>
          <Box>Column 2</Box>
        </Column>
        <Column>
          <Box>Column 3</Box>
        </Column>
      </>
    ),
  },
};

export const TwoColumns: Story = {
  args: {
    children: (
      <>
        <Column>
          <Box>Column 1</Box>
        </Column>
        <Column>
          <Box>Column 2</Box>
        </Column>
      </>
    ),
  },
};

export const ResponsiveColumns: Story = {
  args: {
    query: QueryKeys.TABLET,
    children: (
      <>
        <Column>
          <Box>Stacks on tablet</Box>
        </Column>
        <Column>
          <Box>Stacks on tablet</Box>
        </Column>
        <Column>
          <Box>Stacks on tablet</Box>
        </Column>
      </>
    ),
  },
};

export const NestedColumns: Story = {
  args: {
    children: (
      <>
        <Column>
          <Box>Main Column</Box>
        </Column>
        <Column>
          <Columns>
            <Column>
              <Box>Nested 1</Box>
            </Column>
            <Column>
              <Box>Nested 2</Box>
            </Column>
          </Columns>
        </Column>
      </>
    ),
  },
};
