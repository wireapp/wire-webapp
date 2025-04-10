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

export const e2eMessageContainerCss: CSSObject = {
  width: '100%',
  marginTop: '1rem',
  background: 'var(--green-background)',
  padding: '12px 0',
  display: 'flex',
};

export const e2eMessageIconContainerCss: CSSObject = {
  alignSelf: 'start',
  display: 'flex',
  justifyContent: 'center',
  maxHeight: 'var(--avatar-diameter-xs)',
  width: 'var(--conversation-message-sender-width)',
};

export const e2eMessageIconCss: CSSObject = {
  color: 'var(--green-color)',
};

export const e2eMessageContentContainerCss: CSSObject = {
  display: 'unset',
  flex: 1,
};

export const e2eMessageContentParagraphCss: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-small-plus)',
};

export const e2eMessageContentParagraphWithMarginCss: CSSObject = {
  ...e2eMessageContentParagraphCss,
  margin: '8px 0 2px 0',
};

export const e2eMessageContentLinkCss: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
};
