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
import {ObjectInterpolation, jsx} from '@emotion/core';
import {COLOR} from '../Identity';
import media, {QueryKeys} from '../mediaQueries';
import {TextProps, filterTextProps, textStyles} from './Text';

interface HeadingProps<T = HTMLHeadingElement> extends TextProps<T> {
  level?: string;
}

const h1Styles: (props: HeadingProps) => ObjectInterpolation<undefined> = ({
  block = true,
  color = COLOR.TEXT,
  level = '1',
  noWrap = false,
  textTransform = 'none',
  ...props
}) => ({
  ...textStyles({block, color, noWrap, textTransform, ...props}),
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

const H1 = (props: HeadingProps) => <h1 css={h1Styles(props)} {...filterTextProps(props)} />;

const h2Styles: (props: HeadingProps) => ObjectInterpolation<undefined> = ({
  block = true,
  color = COLOR.TEXT,
  noWrap = false,
  textTransform = 'none',
  ...props
}) => ({
  ...textStyles({block, color, noWrap, textTransform, ...props}),
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '32px',
  marginBottom: '24px',
  marginTop: '48px',
  [media[QueryKeys.MOBILE]]: {
    fontSize: '20px',
    lineHeight: '28px',
    marginBottom: '20px',
    marginTop: '44px',
  },
});

const H2 = (props: HeadingProps) => <h2 css={h2Styles(props)} {...filterTextProps(props)} />;

const h3Styles: (props: HeadingProps) => ObjectInterpolation<undefined> = ({
  block = true,
  color = COLOR.TEXT,
  noWrap = false,
  textTransform = 'none',
  ...props
}) => ({
  ...textStyles({block, color, noWrap, textTransform, ...props}),
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '16px',
});

const H3 = (props: HeadingProps) => <h3 css={h3Styles(props)} {...filterTextProps(props)} />;

const h4Styles: (props: HeadingProps) => ObjectInterpolation<undefined> = ({
  block = true,
  color = COLOR.TEXT,
  noWrap = false,
  textTransform = 'none',
  ...props
}) => ({
  ...textStyles({block, color, noWrap, textTransform, ...props}),
  fontSize: '11px',
  fontWeight: 300,
  marginBottom: '5px',
  marginTop: '20px',
});

const H4 = (props: HeadingProps) => <h3 css={h4Styles(props)} {...filterTextProps(props)} />;

const Heading = ({level, ...props}) => {
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

export {Heading, H1, H2, H3, H4};
