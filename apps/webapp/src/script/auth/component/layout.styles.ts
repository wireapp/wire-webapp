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

import {CSSObject} from '@emotion/react';

import {COLOR_V2, media} from '@wireapp/react-ui-kit';

export const leftSectionCss: CSSObject = {
  background: 'black',
  margin: 0,
  height: '100vh',
  width: '360px',
  padding: '6rem 4rem',
  position: 'relative',
  minHeight: '42rem',
  [media.desktopXL]: {
    width: '460px',
  },
  [media.tabletDown]: {
    display: 'none',
  },
};

export const contentContainerCss: CSSObject = {
  maxHeight: '100vh',
  overflowY: 'auto',
  width: '100%',
  alignSelf: 'center',
  flex: '1',
};

export const whiteFontCss: CSSObject = {
  color: 'white',
};

export const bodyCss: CSSObject = {
  flex: 'auto',
  flexDirection: 'row',
  background: COLOR_V2.GRAY_10,
  height: '100%',
  minHeight: '100vh',
};

export const registrationLayoutContainerCss: CSSObject = {
  margin: '4rem 0',
};

export const registrationLayoutSubHeaderContainerCss: CSSObject = {
  marginTop: '0.75rem',
};

export const registrationLayoutSubHeaderCss: CSSObject = {
  ...whiteFontCss,
  lineHeight: '1.5rem',
};
export const registrationLayoutListItemContainerCss: CSSObject = {
  display: 'flex',
  gap: '6px',
  marginTop: '0.75rem',
};

export const registrationLayoutListItemIconCss: CSSObject = {
  marginTop: '4px',
};

export const setupSidebarStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
  color: '#fff',
  h2: {fontFamily: 'inherit', fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 600, margin: '4rem 0 0.5rem'},
  p: {fontFamily: 'inherit', fontSize: '1rem', fontWeight: 400, lineHeight: '1.5rem', margin: 0, color: '#fff'},
  '.two-factor-sidebar-icon': {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(255,255,255,.1)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    svg: {width: 22, height: 22, fill: 'currentColor', path: {fill: 'currentColor'}},
  },
  ol: {listStyle: 'none', padding: 0, margin: '32px 0 0'},
  li: {display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 13, opacity: 0.45},
  '.active': {opacity: 1},
  '.active span': {background: '#fff', color: '#000'},
  'li span': {
    width: 22,
    height: 22,
    border: '1.5px solid #fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
