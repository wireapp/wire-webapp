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

import {CSS_SQUARE} from 'Util/CSSMixin';

export const channelAvatarContainerCss = (border: string): CSSObject => ({
  ...CSS_SQUARE(28),
  border: `1px solid var(--${border})`,
  borderRadius: 8,
  position: 'relative',
});

export const channelAvatarIconCss = (color: string, background: string): CSSObject => ({
  ...CSS_SQUARE(26),
  backgroundColor: `var(--${background})`,
  color: `var(--${color})`,
  display: 'flex',
  flexWrap: 'wrap',
  overflow: 'hidden',
  borderRadius: 7,
  justifyContent: 'center',
  alignContent: 'center',
});

export const channelAvatarLockIconCss: CSSObject = {
  color: 'var(--app-bg-secondary)',
  backgroundColor: 'var(--main-color)',
  position: 'absolute',
  width: '14px',
  height: '14px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '3px',
  top: '18px',
  left: '18px',
};
