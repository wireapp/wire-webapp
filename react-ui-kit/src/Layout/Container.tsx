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

import * as React from 'react';

import {CSSObject} from '@emotion/react';

import {GUTTER, WIDTH} from './sizes';

import {QueryKeys, media} from '../mediaQueries';
import {filterProps} from '../util';

export interface ContainerProps<T = HTMLDivElement> extends React.HTMLProps<T> {
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

const containerStyle: <T>(props: ContainerProps<T>) => CSSObject = ({
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

const filterContainerProps = (props: ContainerProps) => filterProps(props, ['centerText', 'level', 'verticalCenter']);

export const Container: React.FC<ContainerProps> = React.forwardRef<HTMLDivElement, ContainerProps>((props, ref) => (
  <div ref={ref} css={containerStyle(props)} {...filterContainerProps(props)} />
));
Container.displayName = 'Container';

export type LevelContainerProps = Omit<ContainerProps, 'level'>;

export const ContainerLG = React.forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'lg'} {...props} />
));
ContainerLG.displayName = 'ContainerLG';

export const ContainerMD = React.forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'md'} {...props} />
));
ContainerMD.displayName = 'ContainerMD';

export const ContainerSM = React.forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'sm'} {...props} />
));
ContainerSM.displayName = 'ContainerSM';

export const ContainerXS = React.forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'xs'} {...props} />
));
ContainerXS.displayName = 'ContainerXS';

export const ContainerXXS = React.forwardRef<HTMLDivElement, LevelContainerProps>((props, ref) => (
  <Container ref={ref} level={'xxs'} {...props} />
));
ContainerXXS.displayName = 'ContainerXXS';
