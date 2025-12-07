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

export const confirmConversationTypeContainerCss: CSSObject = {
  padding: '24px',
  borderRadius: '10px',
  width: '400px',
};

export const confirmConversationButtonCss: CSSObject = {
  flex: 1,
  margin: 0,
};

export const confirmConversationHeaderCss: CSSObject = {
  textAlign: 'center',
};

export const confirmConversationTextCss: CSSObject = {
  margin: '1rem 0',
};

export const confirmConversationButtonContainerCss: CSSObject = {
  gap: '0.5rem',
};

export const conversationTypeContainerCss: CSSObject = {
  borderRight: '1px solid var(--border-color)',
  padding: '1.5rem',
  width: '300px',
};

export const conversationFeatureCss: CSSObject = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  padding: '0.25rem',
};

export const conversationFeatureVerifiedIconCss: CSSObject = {
  color: 'var(--accent-color)',
};

export const conversationFeatureIconCss: CSSObject = {
  fill: 'var(--success-color)',
};

export const conversationFeatureContainerCss: CSSObject = {
  marginLeft: '8px',
  marginBottom: '2.5rem',
  marginTop: '0.75rem',
};

export const conversationOptionContainerCss = (isSelected: boolean) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: isSelected ? 'var(--accent-color)' : 'none',
  borderRadius: '12px',
  padding: isSelected ? '12px' : '11px',
  border: isSelected ? 'none' : '1px solid var(--border-color)',
  cursor: 'pointer',
});

export const conversationOptionCss = (isSelected: boolean): CSSObject => ({
  color: isSelected ? 'var(--app-bg-secondary)' : 'var(--text-color)',
  alignItems: 'center',
  gap: '12px',
});

export const conversationOptionNotSelectedCss: CSSObject = {
  width: '14px',
  height: '14px',
  border: '2px solid var(--checkbox-border-disabled)',
  borderRadius: '50%',
  margin: '0px 2px',
};
