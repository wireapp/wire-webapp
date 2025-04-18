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

import {ButtonsGroup} from './ButtonsGroup';

import {FileIcon, DownloadIcon, MoreIcon, GifIcon} from '../../Icon';

const meta: Meta<typeof ButtonsGroup> = {
  title: 'Form/ButtonsGroup',
  component: ButtonsGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ButtonsGroup>;

export const TwoButtons: Story = {
  render: () => (
    <ButtonsGroup>
      <ButtonsGroup.Button>Button 1</ButtonsGroup.Button>
      <ButtonsGroup.Button>Button 2</ButtonsGroup.Button>
    </ButtonsGroup>
  ),
};

export const MultipleButtons: Story = {
  render: () => (
    <ButtonsGroup>
      <ButtonsGroup.Button>Button 1</ButtonsGroup.Button>
      <ButtonsGroup.Button>Button 2</ButtonsGroup.Button>
      <ButtonsGroup.Button>Button 3</ButtonsGroup.Button>
      <ButtonsGroup.Button>Button 3</ButtonsGroup.Button>
    </ButtonsGroup>
  ),
};

export const TwoIconButtons: Story = {
  render: () => (
    <ButtonsGroup>
      <ButtonsGroup.IconButton>
        <FileIcon />
      </ButtonsGroup.IconButton>
      <ButtonsGroup.IconButton>
        <DownloadIcon />
      </ButtonsGroup.IconButton>
    </ButtonsGroup>
  ),
};

export const MultipleIconButtons: Story = {
  render: () => (
    <ButtonsGroup>
      <ButtonsGroup.IconButton>
        <FileIcon />
      </ButtonsGroup.IconButton>
      <ButtonsGroup.IconButton>
        <DownloadIcon />
      </ButtonsGroup.IconButton>
      <ButtonsGroup.IconButton>
        <MoreIcon />
      </ButtonsGroup.IconButton>
      <ButtonsGroup.IconButton>
        <GifIcon />
      </ButtonsGroup.IconButton>
    </ButtonsGroup>
  ),
};
