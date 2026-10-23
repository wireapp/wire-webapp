/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const pageStyles: CSSObject = {
  maxWidth: '708px',
  paddingBottom: '32px',
  color: 'var(--main-color)',
  fontSize: '14px',
  lineHeight: '22px',
  '& > section + section': {borderTop: '1px solid var(--separator-color)', marginTop: '48px', paddingTop: '40px'},
  h3: {fontSize: '20px', lineHeight: '28px', margin: '0 0 16px', fontWeight: 600},
  p: {margin: '0 0 16px'},
  button: {borderRadius: '12px'},
};
export const sectionHeaderStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: '8px',
};
export const mutedStyles: CSSObject = {fontSize: '12px', lineHeight: '18px', color: 'var(--text-input-placeholder)'};
export const actionsStyles: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  margin: '16px 0',
  alignItems: 'center',
};
export const routeStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '1fr 48px 1fr 48px 1fr',
  alignItems: 'center',
  gap: '8px',
  padding: '24px 16px',
  border: '1px solid var(--separator-color)',
  borderRadius: '12px',
  backgroundColor: 'var(--app-bg)',
  '> div': {textAlign: 'center', minWidth: 0},
  strong: {display: 'block', marginTop: '8px', fontSize: '13px'},
  small: {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
  '@media (max-width: 540px)': {gridTemplateColumns: '1fr 16px 1fr 16px 1fr', gap: '4px', padding: '16px 8px'},
};
export const routeIconStyles: CSSObject = {
  display: 'inline-flex',
  position: 'relative',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: 'var(--gray-20)',
  color: 'var(--gray-90)',
  alignItems: 'center',
  justifyContent: 'center',
  '> span': {position: 'absolute', right: '-3px', bottom: '-3px'},
  'body.theme-dark &': {backgroundColor: 'var(--gray-80)', color: 'var(--gray-10)'},
};
export const routeLineStyles: CSSObject = {borderTop: '2px solid #238636', width: '100%'};
export const relayLineStyles: CSSObject = {borderTop: '2px dashed #c67a17', width: '100%'};
export const warningStyles: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '16px',
  marginTop: '12px',
  borderRadius: '10px',
  backgroundColor: '#fff3e2',
  color: '#77480e',
  p: {fontSize: '13px', lineHeight: '19px', margin: '4px 0 0'},
  'body.theme-dark &': {backgroundColor: '#352919', color: '#f1cc8a'},
};
export const scanStyles: CSSObject = {
  border: '1px solid var(--separator-color)',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: 'var(--app-bg)',
  '> details + details': {borderTop: '1px solid var(--separator-color)'},
  summary: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px',
    cursor: 'pointer',
    listStyle: 'none',
    '&::-webkit-details-marker': {display: 'none'},
    '> div': {flex: 1, minWidth: 0},
    strong: {display: 'block', fontWeight: 500},
    small: {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
    '> span:last-of-type': {fontSize: '12px', whiteSpace: 'nowrap'},
    '&::after': {content: '"⌄"', fontSize: '16px'},
  },
  'details[open] > summary::after': {transform: 'rotate(180deg)'},
};
export const scanBodyStyles: CSSObject = {
  padding: '0 16px 16px 44px',
  fontSize: '13px',
  lineHeight: '20px',
  '> p:last-child': {fontSize: '12px', margin: '12px 0 0'},
  '@media (max-width: 540px)': {paddingLeft: '16px'},
};
export const checkListStyles: CSSObject = {
  margin: 0,
  padding: '8px 12px',
  listStyle: 'none',
  borderRadius: '8px',
  backgroundColor: 'var(--gray-20)',
  li: {display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '7px 0'},
  'li > div': {flex: 1},
  strong: {display: 'block', fontWeight: 500},
  small: {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
  'li > span:last-child': {fontSize: '12px'},
  'body.theme-dark &': {backgroundColor: 'var(--gray-80)'},
};
export const statusStyles = (status: 'good' | 'warning' | 'bad' | 'muted'): CSSObject => {
  const colors = {good: '#238636', warning: '#b36b08', bad: '#c52238', muted: 'var(--text-input-placeholder)'};
  return {color: colors[status], fontWeight: 600, flexShrink: 0};
};

export const statusIconStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  lineHeight: '20px',
};
