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

import {Checkbox, CheckboxLabel} from './Checkbox';

import {Link} from '../Text';

const meta = {
  title: 'Form/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <CheckboxLabel>Default Checkbox</CheckboxLabel>,
  },
};

export const WithLink: Story = {
  render: () => (
    <Checkbox>
      <CheckboxLabel>
        I accept the <Link href="#">Terms and Conditions</Link>
      </CheckboxLabel>
    </Checkbox>
  ),
};

export const Invalid: Story = {
  args: {
    children: <CheckboxLabel>Invalid Checkbox</CheckboxLabel>,
    markInvalid: true,
  },
};

export const Disabled: Story = {
  args: {
    children: <CheckboxLabel>Disabled Checkbox</CheckboxLabel>,
    disabled: true,
  },
};
