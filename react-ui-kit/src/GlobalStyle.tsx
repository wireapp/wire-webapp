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
import {Global, ObjectInterpolation, css, jsx} from '@emotion/core';
import emotionNormalize from 'emotion-normalize';
import {withTheme} from 'emotion-theming';
import {Theme} from './Layout';
import {textLinkStyle} from './Text/TextLink';

const globalStyles: (theme: Theme) => ObjectInterpolation<undefined> = theme => ({
  '*': {
    boxSizing: 'border-box',
  },
  a: {
    ...textLinkStyle(theme, {}),
  },
  'b, strong': {
    fontWeight: 600,
  },
  body: {
    MozOsxFontSmoothing: 'grayscale',
    WebkitFontSmoothing: 'antialiased',
    color: theme.general.color,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif',
    fontWeight: 300,
    lineHeight: 1.5,
    minHeight: '100vh',
  },
  p: {
    marginTop: 0,
  },
});

const globalStyle = (theme: Theme) => css`
  ${emotionNormalize}
  ${globalStyles(theme)}
`;

export const GlobalStyle = withTheme(({theme}) => {
  return <Global styles={globalStyle(theme)} />;
});
