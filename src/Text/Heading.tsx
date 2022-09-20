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

/** @jsx jsx */
import {CSSObject, jsx} from '@emotion/react';

import {Theme} from '../Layout';
import {QueryKeys, media} from '../mediaQueries';
import {TextProps, filterTextProps, textStyle} from './Text';

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
  fontSize: '48px',
  fontWeight: 300,
  lineHeight: '56px',
  marginBottom: '64px',
  marginTop: 0,
  minHeight: '48px',
  [media[QueryKeys.MOBILE]]: {
    fontSize: '40px',
    lineHeight: '48px',
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
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '28px',
  marginBottom: '24px',
  marginTop: '32px',
  [media[QueryKeys.MOBILE]]: {
    fontSize: '18px',
    lineHeight: '26px',
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
  fontSize: '16px',
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
  fontSize: '11px',
  fontWeight: 300,
  marginBottom: '5px',
  marginTop: '20px',
});

export const H4 = (props: HeadingProps) => (
  <h3 css={(theme: Theme) => h4Style(theme, props)} {...filterTextProps(props)} />
);
