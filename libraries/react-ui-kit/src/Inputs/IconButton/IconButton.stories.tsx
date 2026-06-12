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

import {IconButton, IconButtonVariant} from './IconButton';

import {InfoIcon, PlusIcon, TrashIcon} from '../../DataDisplay/Icon';
import {COLOR} from '../../Identity/colors/colors';

const meta: Meta<typeof IconButton> = {
  component: IconButton,
  title: 'Inputs/IconButton',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(IconButtonVariant),
    },
    backgroundColor: {
      control: 'color',
    },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Primary: Story = {
  args: {
    children: <InfoIcon />,
    variant: IconButtonVariant.PRIMARY,
  },
};

export const Secondary: Story = {
  args: {
    children: <InfoIcon />,
    variant: IconButtonVariant.SECONDARY,
  },
};

export const Disabled: Story = {
  args: {
    children: <InfoIcon />,
    disabled: true,
  },
};

export const CustomBackground: Story = {
  args: {
    children: <InfoIcon />,
    backgroundColor: COLOR.BLUE,
  },
};

export const AllVariants = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
    <div>
      <h3>Primary Variant</h3>
      <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
        <IconButton variant={IconButtonVariant.PRIMARY}>
          <InfoIcon />
        </IconButton>
        <IconButton variant={IconButtonVariant.PRIMARY} disabled>
          <InfoIcon />
        </IconButton>
      </div>
    </div>

    <div>
      <h3>Secondary Variant</h3>
      <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
        <IconButton variant={IconButtonVariant.SECONDARY}>
          <InfoIcon />
        </IconButton>
        <IconButton variant={IconButtonVariant.SECONDARY} disabled>
          <InfoIcon />
        </IconButton>
      </div>
    </div>
  </div>
);

export const DifferentIcons = () => (
  <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
    <IconButton>
      <InfoIcon />
    </IconButton>
    <IconButton>
      <PlusIcon />
    </IconButton>
    <IconButton>
      <TrashIcon />
    </IconButton>
  </div>
);

export const WithCustomStyles = () => (
  <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
    <IconButton style={{backgroundColor: COLOR.GREEN}}>
      <PlusIcon />
    </IconButton>
    <IconButton style={{backgroundColor: COLOR.RED}}>
      <TrashIcon />
    </IconButton>
    <IconButton style={{border: `2px solid ${COLOR.BLUE}`}}>
      <InfoIcon />
    </IconButton>
  </div>
);

export const Interactive = () => {
  const handleClick = () => alert('Button clicked!');

  return (
    <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
      <IconButton onClick={handleClick}>
        <InfoIcon />
      </IconButton>
      <IconButton disabled onClick={handleClick}>
        <InfoIcon />
      </IconButton>
    </div>
  );
};
