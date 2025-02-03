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

import {Container, ContainerLG, ContainerMD, ContainerSM, ContainerXS, ContainerXXS} from './Container';

import {COLOR} from '../Identity/colors';

const meta: Meta<typeof Container> = {
  component: Container,
  title: 'Layout/Container',
};

export default meta;
type Story = StoryObj<typeof Container>;

const DemoContent = ({children}: {children: ReactNode}) => (
  <div
    style={{
      backgroundColor: COLOR.GRAY_LIGHTEN_72,
      border: `1px solid ${COLOR.GRAY_LIGHTEN_48}`,
      borderRadius: '4px',
      padding: '16px',
      textAlign: 'center',
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: <DemoContent>Default Container</DemoContent>,
  },
};

export const CenteredText: Story = {
  args: {
    centerText: true,
    children: <DemoContent>Centered Text Container</DemoContent>,
  },
};

export const VerticalCentered: Story = {
  args: {
    verticalCenter: true,
    style: {height: '400px'},
    children: <DemoContent>Vertically Centered Container</DemoContent>,
  },
};

export const Sizes = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
    <ContainerXXS>
      <DemoContent>XXS Container</DemoContent>
    </ContainerXXS>
    <ContainerXS>
      <DemoContent>XS Container</DemoContent>
    </ContainerXS>
    <ContainerSM>
      <DemoContent>SM Container</DemoContent>
    </ContainerSM>
    <ContainerMD>
      <DemoContent>MD Container</DemoContent>
    </ContainerMD>
    <ContainerLG>
      <DemoContent>LG Container</DemoContent>
    </ContainerLG>
  </div>
);
