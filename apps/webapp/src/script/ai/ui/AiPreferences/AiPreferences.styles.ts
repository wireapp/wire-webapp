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

export const sectionStyle: React.CSSProperties = {
  marginBottom: '32px',
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  marginBottom: '12px',
  color: '#e5e7eb',
  borderBottom: '1px solid #374151',
  paddingBottom: '6px',
};

export const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '14px',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  color: '#9ca3af',
  marginBottom: '4px',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '5px',
  color: '#f3f4f6',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '5px',
  color: '#f3f4f6',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  resize: 'vertical',
  minHeight: '120px',
  boxSizing: 'border-box',
};

export const buttonPrimaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
};

export const buttonSecondaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  backgroundColor: '#374151',
  color: '#d1d5db',
  border: '1px solid #4b5563',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '0.875rem',
};

export const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
};
