/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import * as React from 'react';

import {CSSObject} from '@emotion/react';

import {COLOR} from '../Identity';
import {filterProps} from '../util';

interface ToolTipProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  bottom?: boolean;
  disabled?: boolean;
  left?: boolean;
  light?: boolean;
  right?: boolean;
  text?: string;
}

const tooltipStyle: <T>(props: ToolTipProps<T>) => CSSObject = ({
  disabled = false,
  bottom = false,
  left = false,
  right = false,
  light = false,
}) => ({
  '&::after': {
    backgroundColor: light ? COLOR.WHITE : COLOR.TEXT,
    borderRadius: '4px',
    bottom: bottom || left || right ? 'auto' : 'calc(100% + 8px)',
    boxShadow: '0 2px 16px 0 rgba(0, 0, 0, 0.12)',
    color: light ? COLOR.TEXT : COLOR.WHITE,
    content: 'attr(data-text)',
    display: 'block',
    fontSize: '12px',
    fontWeight: light ? 400 : 600,
    left: right ? 'calc(100% + 8px)' : 'auto',
    lineHeight: '14px',
    maxWidth: '200px',
    minWidth: '120px',
    opacity: 0,
    padding: '12px',
    pointerEvents: 'none',
    position: 'absolute',
    right: left ? 'calc(100% + 8px)' : 'auto',
    textAlign: 'center',
    top: bottom ? 'calc(100% + 8px)' : 'auto',
    transform: left || right ? `translateX(${left ? -16 : 16}px)` : `translateY(${bottom ? -16 : 16}px)`,
    transition: 'all 0.15s ease-in-out',
  },
  '&:hover::after': disabled || {
    opacity: 1,
    transform: 'translateY(0) translateX(0)',
    transition: 'all 0.25s ease-in-out',
  },
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  position: 'relative',
});

const filterTooltipProps = (props: ToolTipProps) =>
  filterProps(props, ['bottom', 'disabled', 'left', 'light', 'right']);

export const Tooltip = ({text = '', ...props}: ToolTipProps) => (
  <div css={tooltipStyle(props)} data-text={text} {...filterTooltipProps(props)} />
);
