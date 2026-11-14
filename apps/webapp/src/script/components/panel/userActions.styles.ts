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

export const pendingOnboardingInfoStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 24,
  fontSize: 'var(--font-size-base)',
  letterSpacing: '0.05px',
  lineHeight: 'var(--line-height-lg)',
  textAlign: 'center',
};

export const pendingOnboardingTitleStyle: CSSObject = {
  margin: 0,
  fontWeight: 'var(--font-weight-semibold)',
};

export const pendingOnboardingMessageStyle: CSSObject = {
  margin: 0,
  color: 'var(--base-secondary-text)',
};
