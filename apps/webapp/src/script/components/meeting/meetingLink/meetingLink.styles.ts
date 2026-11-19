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

import type {CSSObject} from '@emotion/react';

export const meetingLinkModalFooterStyles: CSSObject = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
  marginTop: '32px',
  marginBottom: '-50px',
};

export const meetingLinkInputStyles: CSSObject = {
  marginTop: '16px',
  padding: '12px 16px',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  overflowWrap: 'anywhere',
  userSelect: 'text',
};

export const meetingLinkStatusStyles: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  gap: '4px',
  marginTop: '12px',
};
