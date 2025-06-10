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

import {Breadcrumbs} from './Breadcrumbs';

import {TrashIcon} from '../../DataDisplay/Icon';

const meta: Meta<typeof Breadcrumbs> = {
  component: Breadcrumbs,
  title: 'Navigation/Breadcrumbs',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  render: () => <Breadcrumbs items={[{name: 'Home'}, {name: 'Folder'}, {name: 'Subfolder'}]} onItemClick={() => {}} />,
};

export const WithCombinedItems: Story = {
  render: () => (
    <Breadcrumbs
      items={[{name: 'Home'}, {name: 'Folder'}, {name: 'Subfolder 1'}, {name: 'Subfolder 2'}, {name: 'Subfolder 3'}]}
      onItemClick={() => {}}
    />
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Breadcrumbs
      items={[{name: 'Home'}, {name: 'Folder', icon: <TrashIcon />}, {name: 'Subfolder'}]}
      onItemClick={() => {}}
    />
  ),
};

export const WithIconsAndCombinedItems: Story = {
  render: () => (
    <Breadcrumbs
      items={[
        {name: 'Home'},
        {name: 'Folder', icon: <TrashIcon />},
        {name: 'Subfolder 1'},
        {name: 'Subfolder 2'},
        {name: 'Subfolder 3'},
      ]}
      onItemClick={() => {}}
    />
  ),
};
