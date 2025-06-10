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

import {RoundIconButton} from './RoundIconButton';

import {
  ArrowIcon,
  AttachmentIcon,
  CheckIcon,
  CloseIcon,
  GifIcon,
  ImageIcon,
  PingIcon,
  PlaneIcon,
  ProfileIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
} from '../../DataDisplay/Icon';
import {COLOR} from '../../Identity';

const meta = {
  title: 'Inputs/RoundIconButton',
  component: RoundIconButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RoundIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <ArrowIcon />,
  },
};

export const IconGallery: Story = {
  render: () => (
    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
      <RoundIconButton>
        <ArrowIcon />
      </RoundIconButton>
      <RoundIconButton>
        <AttachmentIcon />
      </RoundIconButton>
      <RoundIconButton>
        <CheckIcon />
      </RoundIconButton>
      <RoundIconButton>
        <CloseIcon />
      </RoundIconButton>
      <RoundIconButton>
        <GifIcon />
      </RoundIconButton>
      <RoundIconButton>
        <ImageIcon />
      </RoundIconButton>
      <RoundIconButton>
        <PingIcon />
      </RoundIconButton>
      <RoundIconButton>
        <PlaneIcon />
      </RoundIconButton>
      <RoundIconButton>
        <ProfileIcon />
      </RoundIconButton>
      <RoundIconButton>
        <TeamIcon />
      </RoundIconButton>
      <RoundIconButton>
        <TimedIcon />
      </RoundIconButton>
      <RoundIconButton>
        <TrashIcon color={COLOR.RED} />
      </RoundIconButton>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: <ArrowIcon />,
    disabled: true,
  },
};
