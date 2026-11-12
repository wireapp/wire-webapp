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

export const reportStyles: CSSObject = {
  padding: '12px 16px',
  margin: '20px 0 0',
  border: '1px solid var(--gray-30)',
  borderRadius: '8px',
  backgroundColor: 'var(--gray-20)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '12px',
  lineHeight: '18px',
  '> div': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
    gap: '12px',
    padding: '8px 0',
    '& + div': {
      borderTop: '1px solid var(--gray-30)',
    },
  },
  'dt, dd': {
    margin: 0,
    overflowWrap: 'anywhere',
  },
  'body.theme-dark &': {
    backgroundColor: 'var(--gray-90)',
    borderColor: 'var(--gray-70)',
    '> div + div': {
      borderColor: 'var(--gray-70)',
    },
  },
};

export const confirmationMessageStyles: CSSObject = {
  margin: '0 0 20px',
  fontSize: '16px',
  lineHeight: '24px',
};

export const mockNoticeStyles: CSSObject = {
  marginTop: '12px',
  fontSize: '12px',
  lineHeight: '18px',
  color: 'var(--gray-70)',
  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const callLogsModalBodyStyles: CSSObject = {
  paddingBottom: '16px',
};
