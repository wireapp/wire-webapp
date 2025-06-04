/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Accordion} from './Accordion';

import {COLOR_V2} from '../../Identity/colors-v2';
import {Text} from '../../Text';

const meta: Meta<typeof Accordion> = {
  component: Accordion,
  title: 'Misc/Accordion',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div style={{width: '500px', margin: '0 auto', backgroundColor: 'white', padding: '20px'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const SingleOpen: Story = {
  render: () => (
    <Accordion>
      <Accordion.Item title="What is Wire?" value="item-1">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Wire is a secure messaging and collaboration platform that helps teams communicate effectively while
          maintaining the highest standards of security and privacy.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Is Wire secure?" value="item-2">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire uses end-to-end encryption for all messages, calls, and files. This means that only the participants
          in a conversation can read the messages.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Can I use Wire on multiple devices?" value="item-3">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire is available on multiple platforms including desktop (Windows, macOS, Linux), mobile (iOS, Android),
          and web browsers.
        </Text>
      </Accordion.Item>
    </Accordion>
  ),
};

export const MultipleOpen: Story = {
  render: () => (
    <Accordion type="multiple">
      <Accordion.Item title="What is Wire?" value="item-1">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Wire is a secure messaging and collaboration platform that helps teams communicate effectively while
          maintaining the highest standards of security and privacy.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Is Wire secure?" value="item-2">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire uses end-to-end encryption for all messages, calls, and files. This means that only the participants
          in a conversation can read the messages.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Can I use Wire on multiple devices?" value="item-3">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire is available on multiple platforms including desktop (Windows, macOS, Linux), mobile (iOS, Android),
          and web browsers.
        </Text>
      </Accordion.Item>
    </Accordion>
  ),
};

export const WithDefaultOpen: Story = {
  render: () => (
    <Accordion defaultValue="item-2">
      <Accordion.Item title="What is Wire?" value="item-1">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Wire is a secure messaging and collaboration platform that helps teams communicate effectively while
          maintaining the highest standards of security and privacy.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Is Wire secure?" value="item-2">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire uses end-to-end encryption for all messages, calls, and files. This means that only the participants
          in a conversation can read the messages.
        </Text>
      </Accordion.Item>
      <Accordion.Item title="Can I use Wire on multiple devices?" value="item-3">
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Yes, Wire is available on multiple platforms including desktop (Windows, macOS, Linux), mobile (iOS, Android),
          and web browsers.
        </Text>
      </Accordion.Item>
    </Accordion>
  ),
};

export const TooLongTitle: Story = {
  render: () => (
    <Accordion>
      <Accordion.Item
        title="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        value="item-1"
      >
        <Text size={12} color={COLOR_V2.GRAY_80}>
          Wire is a secure messaging and collaboration platform that helps teams communicate effectively while
          maintaining the highest standards of security and privacy.
        </Text>
      </Accordion.Item>
    </Accordion>
  ),
};
