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
import {Global, CSSObject, css, jsx, withTheme} from '@emotion/react';
import emotionNormalize from 'emotion-normalize';
import {GlobalCssVariables} from './GlobalCssVariables';

import type {Theme} from './Layout';
import {textLinkStyle} from './Text/TextLink';

const globalStyles: (theme: Theme) => CSSObject = (theme: Theme) => ({
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
    ...GlobalCssVariables.accentColors(),
    MozOsxFontSmoothing: 'grayscale',
    WebkitFontSmoothing: 'antialiased',
    background: theme.general.backgroundColor,
    color: theme.general.color,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif',
    fontWeight: 300,
    lineHeight: 1.5,
    minHeight: '100vh',
    transition: 'background 0.15s',
  },
  'body, body.theme-default': {
    ...GlobalCssVariables.light(),
  },
  'body.theme-dark': {
    ...GlobalCssVariables.dark(),
  },
  html: {
    background: theme.general.backgroundColor,
    transition: 'background 0.15s',
  },
  p: {
    marginTop: 0,
  },
});

const globalStyle = (theme: Theme) => css`
  ${emotionNormalize}
  ${globalStyles(theme)}
`;

export const GlobalStyle = withTheme(({theme}: {theme: Theme}) => {
  return <Global styles={globalStyle(theme)} />;
});
