/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import styled from 'styled-components';
import {COLOR} from '../Identity';

interface ToolTipProps {
  bottom?: boolean;
  disabled?: boolean;
  left?: boolean;
  light?: boolean;
  right?: boolean;
  text?: string;
}

const Tooltip = styled.div.attrs({'data-text': ({text}) => text})<ToolTipProps & React.HTMLAttributes<HTMLDivElement>>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &::after {
    position: absolute;
    content: attr(data-text);
    display: block;
    opacity: 0;
    transform: translateY(16px);
    bottom: calc(100% + 8px);
    ${({bottom}) =>
      bottom &&
      `
      transform: translateY(-16px);
      bottom: auto;
      top: calc(100% + 8px);
    `};
    ${({left}) =>
      left &&
      `
      transform: translateX(16px);
      bottom: auto;
      right: calc(100% + 8px);
    `};
    ${({right}) =>
      right &&
      `
      transform: translateX(-16px);
      bottom: auto;
      right: auto;
      left: calc(100% + 8px);
    `};
    pointer-events: none;
    border-radius: 4px;
    transition: all 0.15s ease-in-out;
    padding: 12px;
    min-width: 120px;
    max-width: 200px;
    text-align: center;
    font-size: 12px;
    line-height: 14px;
    box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.12);
    ${({light}) =>
      light
        ? `
    background-color: ${COLOR.WHITE};
    color: ${COLOR.TEXT};
    font-weight: 400;
    `
        : `
    background-color: ${COLOR.TEXT};
    color: ${COLOR.WHITE};
    font-weight: 600;
    `};
  }
  ${({disabled}) =>
    !disabled &&
    `
  &:hover::after {
    transition: all 0.25s ease-in-out;
    opacity: 1;
    transform: translateY(0) translateX(0);
  }`};
`;

Tooltip.defaultProps = {
  bottom: false,
  disabled: false,
  left: false,
  light: false,
  right: false,
  text: '',
};

export {Tooltip};
