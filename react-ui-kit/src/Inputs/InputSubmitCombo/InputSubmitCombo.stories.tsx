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

import {InputSubmitCombo} from './InputSubmitCombo';

import {ArrowIcon, AttachmentIcon} from '../../DataDisplay/Icon';
import {Input} from '../Input';
import {RoundIconButton} from '../RoundIconButton';

const meta = {
  title: 'Inputs/InputSubmitCombo',
  component: InputSubmitCombo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputSubmitCombo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <InputSubmitCombo>
      <Input placeholder="Type a message..." name="message" />
      <RoundIconButton type="submit">
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  ),
};

export const WithMultipleButtons: Story = {
  render: () => (
    <InputSubmitCombo>
      <Input placeholder="Type a message..." name="message" />
      <RoundIconButton>
        <AttachmentIcon />
      </RoundIconButton>
      <RoundIconButton type="submit">
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  ),
};

export const Invalid: Story = {
  render: () => (
    <InputSubmitCombo markInvalid>
      <Input placeholder="Invalid input" name="message" markInvalid />
      <RoundIconButton type="submit">
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  ),
};
