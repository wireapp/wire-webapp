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

import {Loading} from './Loading';

import {COLOR} from '../Identity/colors';

const meta: Meta<typeof Loading> = {
  component: Loading,
  title: 'Misc/Loading',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    color: {control: 'color'},
    progress: {control: {type: 'range', min: 0, max: 1, step: 0.01}},
    size: {control: {type: 'range', min: 16, max: 200, step: 1}},
  },
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
  args: {},
};

export const WithProgress: Story = {
  args: {
    progress: 0.33,
  },
};

export const CustomSize: Story = {
  args: {
    size: 100,
  },
};

export const CustomColor: Story = {
  args: {
    color: COLOR.GREEN,
  },
};

export const Variants = () => (
  <div style={{display: 'flex', gap: '32px', alignItems: 'center'}}>
    <Loading />
    <Loading progress={0.33} />
    <Loading progress={0.66} size={100} />
  </div>
);

export const ColorVariants = () => (
  <div style={{display: 'flex', gap: '32px', alignItems: 'center'}}>
    <Loading color={COLOR.BLUE} />
    <Loading color={COLOR.GREEN} />
    <Loading color={COLOR.RED} />
    <Loading color={COLOR.ORANGE} />
  </div>
);

export const SizeVariants = () => (
  <div style={{display: 'flex', gap: '32px', alignItems: 'center'}}>
    <Loading size={24} />
    <Loading size={48} />
    <Loading size={72} />
    <Loading size={96} />
  </div>
);

export const ProgressStages = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
    <div style={{display: 'flex', gap: '32px', alignItems: 'center'}}>
      <Loading progress={0} />
      <Loading progress={0.25} />
      <Loading progress={0.5} />
      <Loading progress={0.75} />
      <Loading progress={1} />
    </div>
    <div style={{display: 'flex', gap: '32px', alignItems: 'center'}}>
      <Loading size={72} progress={0} />
      <Loading size={72} progress={0.25} />
      <Loading size={72} progress={0.5} />
      <Loading size={72} progress={0.75} />
      <Loading size={72} progress={1} />
    </div>
  </div>
);

export const OnDifferentBackgrounds = () => (
  <div style={{display: 'flex', gap: '32px'}}>
    <div style={{padding: '24px', backgroundColor: COLOR.WHITE}}>
      <Loading />
    </div>
    <div style={{padding: '24px', backgroundColor: COLOR.GRAY}}>
      <Loading color={COLOR.WHITE} />
    </div>
    <div style={{padding: '24px', backgroundColor: COLOR.BLACK}}>
      <Loading color={COLOR.WHITE} />
    </div>
  </div>
);
