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

import {Pill, PILL_TYPE} from './Pill';

const meta: Meta<typeof Pill> = {
  component: Pill,
  title: 'DataDisplay/Pill',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    type: {
      control: 'select',
      options: [null, ...Object.values(PILL_TYPE)],
    },
    active: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Default: Story = {
  args: {
    children: 'Default Pill',
  },
};

export const Active: Story = {
  args: {
    children: 'Active Pill',
    active: true,
  },
};

export const Error: Story = {
  args: {
    children: 'Error Pill',
    type: PILL_TYPE.error,
  },
};

export const Success: Story = {
  args: {
    children: 'Success Pill',
    type: PILL_TYPE.success,
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning Pill',
    type: PILL_TYPE.warning,
  },
};

export const AllVariants = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
    <div>
      <Pill>Default Pill</Pill>
      <Pill active>Active Pill</Pill>
    </div>
    <div>
      <Pill type={PILL_TYPE.error}>Error Pill</Pill>
      <Pill type={PILL_TYPE.success}>Success Pill</Pill>
      <Pill type={PILL_TYPE.warning}>Warning Pill</Pill>
    </div>
  </div>
);

export const WithLongText = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
    <Pill>This is a very long text that should wrap nicely inside the pill component</Pill>
    <Pill type={PILL_TYPE.success}>This is a very long successful message that should wrap nicely</Pill>
  </div>
);

export const Interactive = () => (
  <div style={{display: 'flex', gap: '8px'}}>
    <Pill onClick={() => alert('Clicked!')} style={{cursor: 'pointer'}}>
      Clickable Pill
    </Pill>
    <Pill active onClick={() => alert('Active pills can be clicked too!')} style={{cursor: 'pointer'}}>
      Active Clickable
    </Pill>
  </div>
);

export const Combinations = () => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
    <div>
      <Pill type={PILL_TYPE.error} active>
        Active Error
      </Pill>
      <Pill type={PILL_TYPE.success} active>
        Active Success
      </Pill>
      <Pill type={PILL_TYPE.warning} active>
        Active Warning
      </Pill>
    </div>
    <div>
      <Pill type={PILL_TYPE.error} style={{opacity: 0.7}}>
        Faded Error
      </Pill>
      <Pill type={PILL_TYPE.success} style={{opacity: 0.7}}>
        Faded Success
      </Pill>
      <Pill type={PILL_TYPE.warning} style={{opacity: 0.7}}>
        Faded Warning
      </Pill>
    </div>
  </div>
);
