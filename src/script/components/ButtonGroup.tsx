/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {CSSObject} from '@emotion/core';

export interface ButtonGroupProps {
  currentItem: string;
  items: string[];
  onChangeItem: (item: string) => void;
  style?: CSSObject;
}

const buttonGroupWrapperStyles: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  'div:first-of-type': {
    borderBottomLeftRadius: 12,
    borderTopLeftRadius: 12,
    paddingLeft: '14px !important',
  },
  'div:last-of-type': {
    borderBottomRightRadius: 12,
    borderTopRightRadius: 12,
    paddingRight: '14px !important',
  },
};

const buttonGroupItemStyles: CSSObject = {
  backdropFilter: 'blur(16px)',
  backgroundColor: 'rgba(255, 255, 255, 0.16)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  padding: '4px 12px',
  textTransform: 'uppercase',
};

const buttonGroupItemActiveStyles: CSSObject = {
  ...buttonGroupItemStyles,
  backgroundColor: '#fff',
  color: '#33373a',
};

const ButtonGroup: React.FC<ButtonGroupProps> = ({style, items, currentItem, onChangeItem}) => {
  return (
    <div css={{...buttonGroupWrapperStyles, ...style}}>
      {items.map(item => (
        <div
          key={item}
          css={item === currentItem ? buttonGroupItemActiveStyles : buttonGroupItemStyles}
          onClick={() => onChangeItem(item)}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

export default ButtonGroup;
