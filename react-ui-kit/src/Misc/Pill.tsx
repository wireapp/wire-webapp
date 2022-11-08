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

import * as React from 'react';

import {CSSObject, keyframes} from '@emotion/react';

import {COLOR} from '../Identity';
import {DURATION, EASE} from '../Identity/motions';
import {Theme} from '../Layout';
import {filterProps} from '../util';

export interface PillProps<T = HTMLSpanElement> extends React.HTMLProps<T> {
  active?: boolean;
  type?: PILL_TYPE;
}

export enum PILL_TYPE {
  error = 'ERROR',
  success = 'SUCCESS',
  warning = 'WARNING',
}

export const pillStyle: <T>(theme: Theme, props: PillProps<T>) => CSSObject = (
  theme,
  {active = false, type = null},
) => {
  const backgroundColors = {
    [PILL_TYPE.error]: COLOR.RED_OPAQUE_32,
    [PILL_TYPE.success]: COLOR.GREEN_OPAQUE_32,
    [PILL_TYPE.warning]: COLOR.YELLOW_OPAQUE_32,
  };
  const backgroundColor = active ? '#eee' : type ? backgroundColors[type] : 'transparent';
  const pillAnimation = keyframes`
    0% {
      background-color: transparent;
    }
    100% {
      background-color: ${backgroundColor};
    }
`;
  return {
    '&:first-of-type': {
      marginLeft: 0,
    },
    '&:last-of-type': {
      marginRight: 0,
    },
    animation: `${pillAnimation} ${DURATION.DEFAULT}ms ${EASE.QUART}`,
    backgroundColor,
    borderRadius: '160px',
    color: active ? COLOR.TEXT : theme.general.color,
    cursor: active ? 'default' : undefined,
    display: 'inline-block',
    fontSize: '12px',
    lineHeight: '16px',
    margin: type ? '12px 0 0 0' : '0 8px',
    minHeight: '32px',
    padding: '8px 24px',
    textAlign: 'center',
    textDecoration: 'none',
  };
};

export const filterPillProps = (props: PillProps) => filterProps(props, ['active']);

export const Pill = (props: PillProps) => (
  <span
    css={(theme: Theme) => pillStyle(theme, props)}
    data-uie-name="element-pill"
    data-uie-status={props.type}
    {...filterPillProps(props)}
  />
);
