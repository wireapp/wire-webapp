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

import {ComponentProps, FC} from 'react';

import type {Meta} from '@storybook/react';

import {SVGIcon, SVGIconProps} from './SVGIcon';

import * as Icons from './index';

const meta = {
  title: 'Icon/SVGIcon',
  component: SVGIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  render: args => <IconGallery {...args} />,
} satisfies Meta<typeof SVGIcon>;

export default meta;

const IconGallery = (props: ComponentProps<typeof SVGIcon>) => {
  const allIcons = {...Icons} as unknown as Record<string, FC<SVGIconProps>>;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '24px',
        padding: '24px',
        maxWidth: '800px',
      }}
    >
      {Object.entries(allIcons)
        .filter(([_, component]) => typeof component === 'function')
        .map(([name, IconComponent]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
            }}
          >
            <IconComponent {...props} data-uie-name={name} />
            <div style={{fontSize: '12px', textAlign: 'center'}}>{name}</div>
          </div>
        ))}
    </div>
  );
};

export const Default = {};
