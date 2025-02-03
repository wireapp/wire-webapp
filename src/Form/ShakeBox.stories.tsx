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

import {useRef} from 'react';

import type {Meta, StoryObj} from '@storybook/react';

import {Button} from './Button';
import {Input} from './Input';
import {ShakeBox, ShakeBoxRef} from './ShakeBox';

const meta = {
  title: 'Form/ShakeBox',
  component: ShakeBox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ShakeBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const DefaultStory = () => {
  const ref = useRef<ShakeBoxRef>(null);

  return (
    <div>
      <ShakeBox ref={ref}>
        <Input placeholder="Type something..." />
      </ShakeBox>
      <Button
        onClick={() => {
          ref.current?.shake();
        }}
        style={{marginTop: '16px'}}
      >
        Shake Input
      </Button>
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultStory />,
};

const FormStory = () => {
  const ref = useRef<ShakeBoxRef>(null);

  return (
    <ShakeBox ref={ref}>
      <form
        onSubmit={event => {
          event.preventDefault();
          ref.current?.shake();
        }}
      >
        <Input placeholder="Required field" required />
        <Button type="submit" style={{marginTop: '16px'}}>
          Submit to shake
        </Button>
      </form>
    </ShakeBox>
  );
};

export const WithForm: Story = {
  render: () => <FormStory />,
};
