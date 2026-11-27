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

import {css} from '@emotion/react';

export const performancePanelContainerStyles = css({
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 9999,
});

export const performancePanelStyles = css({
  background: 'var(--app-bg-secondary)',
  borderRadius: 12,
  padding: 16,
  minWidth: 220,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
});

export const performancePanelHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
});

export const performancePanelTitleStyles = css({
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
});

export const performancePanelCloseButtonStyles = css({
  minWidth: 0,
});

export const performancePanelResetButtonContainerStyles = css({display: 'flex', justifyContent: 'flex-end'});

export const performancePanelResetButtonStyles = css({marginBottom: 0});

export const buttonBaseStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  height: 40,
  padding: '0 16px',

  borderRadius: 9999, // pill shape
  border: 'none',

  fontSize: 14,
  fontWeight: 500,

  cursor: 'pointer',
  transition: 'all 0.15s ease',

  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
});

export const buttonNeutralStyles = css({
  background: 'var(--inactive-call-button-bg)',
  color: 'var(--app-bg-primary)',

  '&:hover': {
    background: 'var(--inactive-call-button-hover-bg)',
  },
});

export const metricsListStyles = css({
  marginTop: 12,
  padding: 12,
  background: 'var(--inactive-call-button-bg)',
  borderRadius: 8,
  fontSize: 12,
});

export const metricsRowStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 4,
});

export const metricsLabelStyles = css({
  color: '#666',
});

export const metricsValueStyles = css({
  fontWeight: 500,
});
