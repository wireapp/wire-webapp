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

import {useState} from 'react';

import type {Meta, StoryObj} from '@storybook/react';

import {Switch} from './Switch';

interface SwitchStoryProps {
  checked: boolean;
  disabled?: boolean;
}

const DefaultStory = ({checked, disabled}: SwitchStoryProps) => {
  const [isChecked, setIsChecked] = useState(checked);
  return <Switch checked={isChecked} disabled={disabled} onToggle={() => setIsChecked(!isChecked)} />;
};

const meta = {
  title: 'Form/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  render: ({checked, disabled, ...args}) => <DefaultStory {...args} checked={checked} disabled={disabled} />,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    disabled: false,
    onToggle: () => {},
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    disabled: false,
    onToggle: () => {},
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    onToggle: () => {},
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
    onToggle: () => {},
  },
};
