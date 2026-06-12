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

import type {Meta, StoryObj} from '@storybook/react';

import {DropFileInput} from './DropFileInput';

const meta = {
  title: 'Inputs/DropFileInput',
  component: DropFileInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DropFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    headingText: 'Drag & Drop an image \nor',
    labelText: 'select one from your device',
    accept: 'image/png, image/jpeg',
    description: 'Image (JPG/PNG) size up to 1 MB, minimum 200 x 600 px',
    // eslint-disable-next-line no-console
    onFilesUploaded: files => console.log('Files uploaded:', files),
    // eslint-disable-next-line no-console
    onInvalidFilesDropError: () => console.log('Invalid file type'),
  },
};
