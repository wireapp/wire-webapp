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

export const adminlessDeleteReminderContainerCss: CSSObject = {
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 24,
  paddingLeft: 23,
  paddingRight: 16,
};

export const adminlessDeleteReminderIconCss: CSSObject = {
  width: 16,
  height: 20,
  position: 'relative',
  flexShrink: 0,
  fill: 'var(--red-500)',
};

export const adminlessDeleteReminderTextContainerCss: CSSObject = {
  flex: '1 1 0',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-small-plus)',
  color: 'var(--red-500)',
  wordBreak: 'break-word',

  '& strong': {
    fontWeight: 'var(--font-weight-bold)',
  },
};

export const adminlessDeleteReminderLinkCss: CSSObject = {
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-small-plus)',
  textDecoration: 'underline',
};
