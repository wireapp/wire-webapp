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

import {HeaderMenu} from './HeaderMenu';

import {COLOR} from '../../Identity/colors/colors';
import {Logo} from '../../Identity/Logo/Logo';
import {Text} from '../../Typography';

const meta: Meta<typeof HeaderMenu> = {
  component: HeaderMenu,
  title: 'Layout/HeaderMenu',
  decorators: [
    Story => (
      <div style={{height: '400px', position: 'relative', paddingRight: '16px'}}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof HeaderMenu>;

const MenuLink = ({children}: {children: ReactNode}) => (
  <Text
    style={{
      cursor: 'pointer',
      display: 'block',
      margin: '16px 16px 0 16px',
      textDecoration: 'none',
    }}
  >
    {children}
  </Text>
);

export const Default: Story = {
  args: {
    logoElement: <Logo height={16} />,
    centerElement: (
      <div style={{color: COLOR.GRAY}}>
        <Text block>Center Element</Text>
      </div>
    ),
    children: (
      <>
        <MenuLink>{'First Link'}</MenuLink>
        <MenuLink>{'Second Link'}</MenuLink>
        <MenuLink>{'Third Link'}</MenuLink>
      </>
    ),
  },
};

export const WithoutCenterElement: Story = {
  args: {
    logoElement: <Logo height={16} />,
    children: (
      <>
        <MenuLink>{'First Link'}</MenuLink>
        <MenuLink>{'Second Link'}</MenuLink>
        <MenuLink>{'Third Link'}</MenuLink>
      </>
    ),
  },
};

export const WithoutLogo: Story = {
  args: {
    centerElement: (
      <div style={{color: COLOR.GRAY}}>
        <Text block>Center Element</Text>
      </div>
    ),
    children: (
      <>
        <MenuLink>{'First Link'}</MenuLink>
        <MenuLink>{'Second Link'}</MenuLink>
        <MenuLink>{'Third Link'}</MenuLink>
      </>
    ),
  },
};

export const MinimalExample: Story = {
  args: {
    children: (
      <>
        <MenuLink>{'First Link'}</MenuLink>
        <MenuLink>{'Second Link'}</MenuLink>
        <MenuLink>{'Third Link'}</MenuLink>
      </>
    ),
  },
};
