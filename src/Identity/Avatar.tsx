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
import React, {useEffect, useRef} from 'react';
import {filterProps} from '../util';
import {COLOR} from './colors';

export interface AvatarProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  backgroundColor?: string;
  base64Image?: string;
  borderColor?: string;
  fetchImage?: () => void;
  forceInitials?: boolean;
  isAvatarGridItem?: boolean;
  name: string;
  size?: number;
}

const avatarStyle: <T>(props: AvatarProps<T>) => ObjectInterpolation<undefined> = ({
  color = COLOR.WHITE,
  base64Image,
  forceInitials,
  borderColor,
  backgroundColor = COLOR.GRAY,
  size = 28,
  isAvatarGridItem,
}) => {
  const BORDER_SIZE_LIMIT = 32;
  const borderSize = size > BORDER_SIZE_LIMIT ? 2 : 1;
  const borderWidth = base64Image ? 0 : borderSize;
  const fontSize = `${Math.ceil(size / 2.2)}px`;

  return {
    alignItems: 'center',
    backgroundColor: backgroundColor,
    backgroundImage: forceInitials ? undefined : base64Image && `url(data:image/png;base64,${base64Image})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    borderRadius: isAvatarGridItem ? '0' : '50%',
    boxShadow: isAvatarGridItem ? 'none' : `inset 0 0 0 ${borderWidth}px ${borderColor}`,
    color,
    display: 'flex',
    fontSize,
    fontWeight: isAvatarGridItem ? 700 : 300,
    justifyContent: 'center',
    maxHeight: `${size}px`,
    maxWidth: `${size}px`,
    minHeight: `${size}px`,
    minWidth: `${size}px`,
  };
};

const filteredAvatarProps = (props: AvatarProps) =>
  filterProps(props, [
    'size',
    'forceInitials',
    'name',
    'base64Image',
    'borderColor',
    'backgroundColor',
    'fetchImage',
    'isAvatarGridItem',
  ]);

export const Avatar = (props: AvatarProps) => {
  const {base64Image, forceInitials, name, fetchImage, isAvatarGridItem} = props;
  const element = useRef<HTMLDivElement>();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(([initial]) => initial && initial.toUpperCase())
      .join('')
      .substring(0, isAvatarGridItem ? 1 : 2);

  useEffect(() => {
    let observer = undefined;
    if (fetchImage) {
      observer = new IntersectionObserver(([{isIntersecting}]) => {
        if (isIntersecting) {
          observer.disconnect();
          if (!base64Image && fetchImage) {
            fetchImage();
          }
        }
      });
      observer.observe(element.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [fetchImage]);

  return (
    <div
      ref={element}
      css={avatarStyle(props)}
      data-uie-name={!forceInitials && base64Image ? 'element-avatar-image' : 'element-avatar-initials'}
      {...filteredAvatarProps(props)}
    >
      {(forceInitials || !base64Image) && getInitials(name)}
    </div>
  );
};
