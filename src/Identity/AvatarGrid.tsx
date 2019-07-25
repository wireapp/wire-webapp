/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

/** @jsx jsx */
import {ObjectInterpolation, jsx} from '@emotion/core';
import React from 'react';
import {AvatarProps} from '../Identity/';
import {filterProps} from '../util';
import {Avatar} from './Avatar';
import {COLOR} from './colors';

interface Props<T = HTMLDivElement> extends React.HTMLProps<T> {
  items: (Omit<AvatarProps, 'borderColor' | 'size' | 'borderColor' | 'isAvatarGridItem'>)[];
  size?: number;
  backgroundColor?: string;
  borderColor?: string;
}

const avatarGridStyle: <T>(props: Props<T>) => ObjectInterpolation<undefined> = ({
  size = 26,
  backgroundColor = COLOR.GRAY_DARKEN_48,
  borderColor = COLOR.GRAY_DARKEN_48,
}) => {
  const borderWidth = 1;
  return {
    alignItems: 'start',
    backgroundColor: backgroundColor,
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: '16%',
    display: 'grid',
    gridGap: borderWidth,
    gridTemplateColumns: 'repeat(2, 1fr)',
    justifyItems: 'center',
    minHeight: `${size + borderWidth * 2}px`,
    overflow: 'hidden',
  };
};

const filteredAvatarGridProps = (props: Props) =>
  filterProps(props, ['backgroundColor', 'borderColor', 'items', 'size']);

export const AvatarGrid = (props: Props) => {
  const {size, items} = props;
  const slicedItems = items.slice(0, 4);
  const missing = 4 - slicedItems.length;
  for (let index = 0; index < missing; index++) {
    slicedItems.push(null);
  }
  return (
    <div css={avatarGridStyle(props)} {...filteredAvatarGridProps(props)}>
      {slicedItems.map(item =>
        item ? (
          <Avatar
            key={Math.random().toString()}
            backgroundColor={item.backgroundColor || COLOR.GRAY_DARKEN_80}
            base64Image={item.base64Image}
            color={item.color}
            fetchImage={item.fetchImage}
            forceInitials={item.forceInitials}
            isAvatarGridItem
            name={item.name}
            size={size / 2}
          />
        ) : (
          <div css={{backgroundColor: COLOR.GRAY_DARKEN_80, width: size / 2, height: size / 2}} />
        ),
      )}
    </div>
  );
};
