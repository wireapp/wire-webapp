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

import {Meta, StoryObj} from '@storybook/react/*';

import {DropdownMenu} from './DropdownMenu';

import {PlusIcon} from '../../Icon';

const meta: Meta<typeof DropdownMenu> = {
  component: DropdownMenu,
  title: 'Modal/DropdownMenu',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger cssObj={{width: '40px', height: '40px'}}>
        <PlusIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => {}}>Copy</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Details</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Delete for me</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  ),
};

export const WithLongItems: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger cssObj={{width: '40px', height: '40px'}}>
        <PlusIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => {}}>Copy the detail of this message</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Contact the sender</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Delete this message (works only if you are the owner)</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  ),
};

export const WithCustomTrigger: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button
          css={{
            width: '200px',
            height: '40px',
          }}
        >
          show menu
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => {}}>Copy</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Details</DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => {}}>Delete for me</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  ),
};
