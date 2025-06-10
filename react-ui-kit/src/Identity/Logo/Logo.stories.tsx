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

import {COLOR} from '../colors';
import {Logo} from '../Logo';

const meta: Meta<typeof Logo> = {
  component: Logo,
  title: 'Identity/Logo',
  argTypes: {
    height: {control: {type: 'number', min: 12, max: 96, step: 4}},
    color: {control: 'color'},
  },
  decorators: [
    Story => (
      <div style={{padding: '24px'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  args: {
    height: 32,
  },
};

export const CustomColor: Story = {
  args: {
    color: COLOR.BLUE,
    height: 32,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start'}}>
      <Logo height={16} />
      <Logo height={24} />
      <Logo height={32} />
      <Logo height={48} />
      <Logo height={64} />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      <div style={{padding: '12px'}}>
        <Logo height={32} color={COLOR.BLUE} />
      </div>
      <div style={{padding: '12px', backgroundColor: COLOR.BLUE}}>
        <Logo height={32} color={COLOR.WHITE} />
      </div>
      <div style={{padding: '12px', backgroundColor: COLOR.BLACK}}>
        <Logo height={32} color={COLOR.WHITE} />
      </div>
      <div style={{padding: '12px', backgroundColor: COLOR.GRAY}}>
        <Logo height={32} color={COLOR.WHITE} />
      </div>
    </div>
  ),
};

export const OnDifferentBackgrounds: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      {[
        COLOR.WHITE,
        COLOR.GRAY_LIGHTEN_48,
        COLOR.GRAY_LIGHTEN_72,
        COLOR.GRAY,
        COLOR.GRAY_DARKEN_48,
        COLOR.GRAY_DARKEN_72,
        COLOR.BLACK,
      ].map(backgroundColor => (
        <div
          key={backgroundColor}
          style={{
            alignItems: 'center',
            backgroundColor,
            display: 'flex',
            gap: '24px',
            padding: '24px',
          }}
        >
          <Logo height={32} color={backgroundColor === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE} />
          <code style={{color: backgroundColor === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE}}>{backgroundColor}</code>
        </div>
      ))}
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div
      style={{
        alignItems: 'center',
        backgroundColor: COLOR.GRAY_LIGHTEN_72,
        display: 'flex',
        gap: '16px',
        justifyContent: 'space-between',
        padding: '16px 24px',
      }}
    >
      <Logo height={24} />
      <div style={{display: 'flex', gap: '16px'}}>
        <div style={{height: '24px', width: '24px', backgroundColor: COLOR.GRAY_LIGHTEN_32}} />
        <div style={{height: '24px', width: '24px', backgroundColor: COLOR.GRAY_LIGHTEN_32}} />
        <div style={{height: '24px', width: '24px', backgroundColor: COLOR.GRAY_LIGHTEN_32}} />
      </div>
    </div>
  ),
};
