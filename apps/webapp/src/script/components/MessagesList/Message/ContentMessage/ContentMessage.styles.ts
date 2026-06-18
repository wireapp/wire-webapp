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

export const messageBodyWrapper = (isEphemeralMessage = false): CSSObject => ({
  display: 'grid',
  gridTemplateColumns: isEphemeralMessage
    ? '64px calc(100% - var(--delivered-state-width) - 64px) var(--delivered-state-width)'
    : 'calc(100% - var(--delivered-state-width)) var(--delivered-state-width)',
  paddingLeft: isEphemeralMessage ? '0' : 'var(--conversation-message-sender-width)',
});

export const messageEphemeralTimer: CSSObject = {
  textAlign: 'center',
};

export const deliveredMessageIndicator: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: '2px',
  width: 'var(--delivered-state-width)',
};

export const threadRepliesContainer: CSSObject = {
  paddingLeft: 'var(--conversation-message-sender-width)',
  paddingTop: '4px',
};

export const threadRepliesIcon: CSSObject = {
  flexShrink: 0,
  width: '14px',
  height: '14px',
};

export const threadRepliesButton: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'var(--accent-color-50)',
  border: '1px solid var(--accent-color-100)',
  borderRadius: '999px',
  color: 'var(--accent-color)',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: '16px',
  padding: '4px 10px',
  textAlign: 'left',
  'body.theme-dark &': {
    backgroundColor: 'var(--accent-color-800)',
    borderColor: 'var(--accent-color-700)',
    color: 'var(--white)',
  },
};

export const threadRepliesButtonUnread: CSSObject = {
  backgroundColor: 'var(--accent-color-100)',
  borderColor: 'var(--accent-color)',
  color: 'var(--main-color)',
  'body.theme-dark &': {
    backgroundColor: 'var(--accent-color-700)',
    borderColor: 'var(--accent-color-500)',
    color: 'var(--white)',
  },
};

export const threadRepliesButtonUnreadMentioned: CSSObject = {
  backgroundColor: 'var(--accent-color)',
  borderColor: 'var(--accent-color)',
  color: 'var(--white)',
  fontWeight: 600,
  'body.theme-dark &': {
    backgroundColor: 'var(--accent-color-500)',
    borderColor: 'var(--accent-color-400)',
    color: 'var(--white)',
  },
};
