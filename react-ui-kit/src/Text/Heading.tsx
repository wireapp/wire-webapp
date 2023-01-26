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

import {CSSObject} from '@emotion/react';

import {TextProps, filterTextProps, textStyle} from './Text';

import {Theme} from '../Layout';
import {QueryKeys, media} from '../mediaQueries';

interface HeadingProps<T = HTMLHeadingElement> extends TextProps<T> {
  level?: string;
}

export const Heading = ({level, ...props}: HeadingProps) => {
  switch (level) {
    case '2':
      return <H2 {...props} />;
    case '3':
      return <H3 {...props} />;
    case '4':
      return <H4 {...props} />;
    case '1':
    default:
      return <H1 {...props} />;
  }
};

export const h1Style: <T>(theme: Theme, props: HeadingProps<T>) => CSSObject = (
  theme,
  {block = true, color = theme.general.color, level = '1', noWrap = false, textTransform = 'none', ...props},
) => ({
  ...textStyle(theme, {block, color, noWrap, textTransform, ...props}),
  fontSize: '3rem',
  fontWeight: 400,
  lineHeight: '3.5rem',
  marginBottom: '64px',
  marginTop: 0,
  minHeight: '3rem',
  [media[QueryKeys.MOBILE]]: {
    fontSize: '2.5rem',
    lineHeight: '3rem',
  },
});

export const H1 = (props: HeadingProps) => (
  <h1 css={(theme: Theme) => h1Style(theme, props)} {...filterTextProps(props)} />
);

export const h2Style: <T>(theme: Theme, props: HeadingProps<T>) => CSSObject = (
  theme,
  {block = true, color = theme.general.color, noWrap = false, textTransform = 'none', ...props},
) => ({
  ...textStyle(theme, {block, color, noWrap, textTransform, ...props}),
  fontSize: '1.25rem',
  fontWeight: 700,
  lineHeight: '1.75rem',
  marginBottom: '24px',
  marginTop: '32px',
  [media[QueryKeys.MOBILE]]: {
    fontSize: '1.125rem',
    lineHeight: '1.625rem',
    marginBottom: '20px',
    marginTop: '26px',
  },
});

export const H2 = (props: HeadingProps) => (
  <h2 css={(theme: Theme) => h2Style(theme, props)} {...filterTextProps(props)} />
);

export const h3Style: <T>(theme: Theme, props: HeadingProps<T>) => CSSObject = (
  theme,
  {block = true, color = theme.general.color, noWrap = false, textTransform = 'none', ...props},
) => ({
  ...textStyle(theme, {block, color, noWrap, textTransform, ...props}),
  fontSize: theme.fontSizes.base,
  fontWeight: 600,
  marginBottom: '16px',
});

export const H3 = (props: HeadingProps) => (
  <h3 css={(theme: Theme) => h3Style(theme, props)} {...filterTextProps(props)} />
);

export const h4Style: <T>(theme: Theme, props: HeadingProps<T>) => CSSObject = (
  theme,
  {block = true, color = theme.general.color, noWrap = false, textTransform = 'none', ...props},
) => ({
  ...textStyle(theme, {block, color, noWrap, textTransform, ...props}),
  fontSize: theme.fontSizes.extraSmall,
  fontWeight: 400,
  marginBottom: '5px',
  marginTop: '20px',
});

export const H4 = (props: HeadingProps) => (
  <h3 css={(theme: Theme) => h4Style(theme, props)} {...filterTextProps(props)} />
);
