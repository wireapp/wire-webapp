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
  alignItems: 'start',
  gap: '8px',
  padding: '24px 16px',
  '> div': {textAlign: 'center', minWidth: 0},
  '> span': {marginBlockStart: '23px'},
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
export const connectionProgressStyles: CSSObject = {
  border: '1px solid var(--separator-color)',
  borderRadius: '12px',
  padding: '14px 16px',
  backgroundColor: 'var(--app-bg)',
  progress: {
    appearance: 'none',
    display: 'block',
    width: '100%',
    height: '4px',
    margin: '10px 0 8px',
    border: 0,
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: 'var(--separator-color)',
    '&::-webkit-progress-bar': {backgroundColor: 'var(--separator-color)'},
    '&::-webkit-progress-value': {backgroundColor: '#238636'},
    '&::-moz-progress-bar': {backgroundColor: '#238636'},
  },
  ol: {listStyle: 'none', padding: 0, margin: 0},
  li: {display: 'flex', alignItems: 'flex-start', gap: '8px', paddingBlock: '4px'},
  'li > div': {flex: 1, overflowWrap: 'anywhere'},
  'li > span': {flexShrink: 0},
  small: {display: 'block', color: 'var(--text-input-placeholder)'},
  '[aria-current="step"]': {fontWeight: 600},
};

export const connectionQualityStyles: CSSObject = {borderTop: '1px solid var(--separator-color)'};
export const qualityThresholdsStyles: CSSObject = {
  marginTop: '8px',
  fontSize: '11px',
  lineHeight: '16px',
  color: 'var(--text-input-placeholder)',
  summary: {cursor: 'pointer'},
  ul: {margin: '4px 0 0', paddingInlineStart: '16px'},
};

export const routeLineStyles: CSSObject = {borderTop: '2px solid #238636', width: '100%'};
export const relayLineStyles: CSSObject = {borderTop: '2px dashed #c67a17', width: '100%'};
export const unknownRouteLineStyles: CSSObject = {borderTop: '2px dashed var(--separator-color)', width: '100%'};
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
  '> details > summary': {
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
    '> span:nth-of-type(2)': {fontSize: '12px', whiteSpace: 'nowrap'},
    '> span:last-child': {
      flexShrink: 0,
      backgroundColor: 'var(--gray-20)',
      'body.theme-dark &': {backgroundColor: 'var(--gray-80)'},
    },
  },
  '> details[open] > summary > span:last-child svg': {transform: 'rotate(180deg)'},
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
  '> li': {display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '7px 0'},
  'li > div': {flex: 1},
  strong: {display: 'block', fontWeight: 500},
  small: {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
  'li > span:last-child': {fontSize: '12px'},
  'body.theme-dark &': {backgroundColor: 'var(--gray-80)'},
};
export const networkQualityNoteStyles: CSSObject = {
  display: 'block',
  margin: '8px 0 0',
  fontSize: '11px',
  lineHeight: '16px',
  color: 'var(--text-input-placeholder)',
};

export const networkResultListStyles: CSSObject = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  border: '1px solid var(--separator-color)',
  borderRadius: '8px',
  backgroundColor: 'var(--gray-20)',
  '> li + li': {borderTop: '1px solid white'},
  'body.theme-dark &': {
    backgroundColor: 'var(--gray-80)',
    '> li + li': {borderTopColor: 'var(--separator-color)'},
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: '20px minmax(0, 1fr) auto 24px',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    listStyle: 'none',
    '&::-webkit-details-marker': {display: 'none'},
  },
  'summary > span:nth-child(3)': {fontSize: '12px', textAlign: 'end'},
  'summary strong': {fontWeight: 500},
  'summary small': {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
  'details[open] > summary > span:last-child svg': {transform: 'rotate(180deg)'},
};

export const networkResultChevronStyles: CSSObject = {
  display: 'inline-grid',
  placeItems: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  backgroundColor: 'var(--app-bg)',
};

export const networkDetailStatusStyles: CSSObject = {
  display: 'inline-flex',
  verticalAlign: 'middle',
};

export const networkResultStyles: CSSObject = {
  display: 'grid',
  gap: '8px',
  margin: 0,
  borderTop: '1px solid var(--separator-color)',
  padding: '8px 44px 10px 40px',
  '> div': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '2px 8px',
  },
  '> div + div': {
    borderTop: '1px solid var(--separator-color)',
    marginInlineEnd: '-44px',
    paddingBlockStart: '8px',
    paddingInlineEnd: '44px',
  },
  dd: {margin: 0, overflowWrap: 'anywhere'},
  small: {display: 'block', fontSize: '11px', lineHeight: '16px', color: 'var(--text-input-placeholder)'},
  'dd:nth-child(2)': {textAlign: 'end'},
  ul: {margin: 0, paddingInlineStart: '12px', listStyle: 'disc'},
};

export const relayResultGroupStyles: CSSObject = {
  borderTop: '1px solid var(--separator-color)',
  '> h4': {margin: 0, padding: '8px 44px 0 40px', fontSize: 'inherit', fontWeight: 600},
};

export const tlsPortHeadingStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

export const tlsServerListStyles: CSSObject = {
  margin: '4px 0 0',
  fontSize: '11px',
  lineHeight: '16px',
  '> div': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '8px',
    paddingBlock: '4px',
  },
  dt: {overflowWrap: 'anywhere'},
  code: {color: 'var(--text-input-placeholder)'},
};

export const relayResultStyles: CSSObject = {
  borderTop: 0,
  '> div': {gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'},
  dt: {overflowWrap: 'anywhere'},
};

export const stunNoteStyles: CSSObject = {
  ...networkQualityNoteStyles,
  margin: '0 44px 10px 40px',
};

export const networkResultAddressesStyles: CSSObject = {
  gridColumn: '1 / -1',
  paddingInlineStart: '8px',
  color: 'var(--text-input-placeholder)',
  fontSize: '11px',
  lineHeight: '16px',
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
