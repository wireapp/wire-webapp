/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const DeliveryIndicatorContainerStyles = (height?: number): CSSObject => ({
  display: 'flex',
  boxSizing: 'border-box',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'absolute',
  top: 0,
  right: 0,
  overflow: 'unset',
  padding: '0 24px 0 16px',
  height: height ? `${height}px` : 'min-content',
});

export const DeliveredIndicatorStyles = (isLastDeliveredMessage: boolean): CSSObject => ({
  color: 'var(--content-message-timestamp)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  wordWrap: 'normal',
  width: 'min-content',
  visibility: isLastDeliveredMessage ? 'unset' : 'hidden',
});
