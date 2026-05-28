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

import React from 'react';

export const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '10px 14px',
  borderRadius: '6px',
  marginBottom: '6px',
  cursor: 'pointer',
  border: '1px solid #34373d',
  background: '#26272c',
  userSelect: 'none',
};

export const itemRowSelectedStyle: React.CSSProperties = {
  background: '#1e3a5f',
  borderColor: '#3b82f6',
};

export const checkboxStyle: React.CSSProperties = {
  accentColor: '#3b82f6',
  width: '15px',
  height: '15px',
  flexShrink: 0,
  marginTop: '2px',
  cursor: 'pointer',
};

export const itemTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#dce0e3',
  lineHeight: 1.4,
};

export const itemDescStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#676b71',
  marginTop: '3px',
  lineHeight: 1.4,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
};

export const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#676b71',
  padding: '32px 24px',
  fontSize: '0.85rem',
};
