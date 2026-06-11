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

import {ButtonGroup} from './ButtonGroup';

import {PlusIcon} from '../../DataDisplay/Icon';

const meta: Meta<typeof ButtonGroup> = {
  component: ButtonGroup,
  title: 'Inputs/ButtonGroup',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
  args: {
    children: (
      <>
        <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
        <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>Button</ButtonGroup.Button>
        <ButtonGroup.Button>Text only</ButtonGroup.Button>
      </>
    ),
  },
};

export const SingleButton: Story = {
  args: {
    children: <ButtonGroup.Button>Text only</ButtonGroup.Button>,
  },
};

export const WithIcons = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
    <ButtonGroup>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
    </ButtonGroup>
    <ButtonGroup>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>Add</ButtonGroup.Button>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>Create</ButtonGroup.Button>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>New</ButtonGroup.Button>
    </ButtonGroup>
  </div>
);

export const MixedContent = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
    <ButtonGroup>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
      <ButtonGroup.Button>Middle</ButtonGroup.Button>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>End</ButtonGroup.Button>
    </ButtonGroup>
    <ButtonGroup>
      <ButtonGroup.Button>Start</ButtonGroup.Button>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />
      <ButtonGroup.Button>End</ButtonGroup.Button>
    </ButtonGroup>
  </div>
);
