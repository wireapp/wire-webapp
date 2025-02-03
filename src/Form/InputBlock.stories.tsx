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

import {Input} from './Input';
import {InputBlock} from './InputBlock';
import {InputSubmitCombo} from './InputSubmitCombo';
import {RoundIconButton} from './RoundIconButton';

import {ArrowIcon} from '../Icon';

const meta = {
  title: 'Form/InputBlock',
  component: InputBlock,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <InputBlock>
      <Input placeholder="First input" />
      <Input placeholder="Second input" />
    </InputBlock>
  ),
};

export const WithSubmitCombo: Story = {
  render: () => (
    <InputBlock>
      <Input placeholder="Regular input" />
      <InputSubmitCombo>
        <Input placeholder="Input with submit" />
        <RoundIconButton type="submit">
          <ArrowIcon />
        </RoundIconButton>
      </InputSubmitCombo>
    </InputBlock>
  ),
};

export const Invalid: Story = {
  render: () => (
    <InputBlock>
      <Input placeholder="Invalid input" markInvalid />
      <Input placeholder="Another invalid input" markInvalid />
    </InputBlock>
  ),
};
