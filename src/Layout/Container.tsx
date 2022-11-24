/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {FC, forwardRef, HTMLProps} from 'react';

import {CSSObject} from '@emotion/react';

import {GUTTER, WIDTH} from './sizes';

import {QueryKeys, media} from '../mediaQueries';

export interface ContainerProps extends HTMLProps<HTMLDivElement> {
  centerText?: boolean;
  level?: keyof Level;
  verticalCenter?: boolean;
}

export interface Level {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}

const LEVEL: Level = {
  lg: WIDTH.DESKTOP_MAX,
  md: WIDTH.TABLET_MAX,
  sm: WIDTH.TABLET_MIN,
  xs: WIDTH.MOBILE,
  xxs: WIDTH.TINY,
};

const containerStyle: (props: ContainerProps) => CSSObject = ({
  centerText = false,
  level = undefined,
  verticalCenter = false,
}) => ({
  margin: verticalCenter ? 'auto' : '0 auto',
  maxWidth: level ? `${LEVEL[level]}px` : undefined,
  position: 'relative',
  textAlign: centerText ? 'center' : 'left',
  width: '100%',
  [media[QueryKeys.DESKTOP]]: level
    ? undefined
    : {
        padding: 0,
        width: `${WIDTH.DESKTOP_MIN - GUTTER * 2}px`,
      },
});

export const Container: FC<ContainerProps> = forwardRef<HTMLDivElement, ContainerProps>(
  ({centerText, level, verticalCenter, ...props}, ref) => (
    <div ref={ref} css={containerStyle({centerText, level, verticalCenter})} {...props} />
  ),
);
Container.displayName = 'Container';

export type LevelContainerProps = Omit<ContainerProps, 'level'>;

export const ContainerLG: FC<ContainerProps> = forwardRef((props, ref) => (
  <Container ref={ref} level={'lg'} {...props} />
));
ContainerLG.displayName = 'ContainerLG';

export const ContainerMD: FC<ContainerProps> = forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'md'} {...props} />
));
ContainerMD.displayName = 'ContainerMD';

export const ContainerSM: FC<ContainerProps> = forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'sm'} {...props} />
));
ContainerSM.displayName = 'ContainerSM';

export const ContainerXS: FC<ContainerProps> = forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'xs'} {...props} />
));
ContainerXS.displayName = 'ContainerXS';

export const ContainerXXS: FC<ContainerProps> = forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'xxs'} {...props} />
));
ContainerXXS.displayName = 'ContainerXXS';
