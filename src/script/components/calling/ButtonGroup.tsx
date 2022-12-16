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

import {CSSObject} from '@emotion/react';

export interface ButtonGroupTab {
  getText: (substitution?: string | Record<string, string>) => string;
  value: string;
}

export interface ButtonGroupProps {
  currentItem: string;
  items: ButtonGroupTab[];
  onChangeItem: (item: string) => void;
  style?: CSSObject;
  textSubstitute?: string | Record<string, string>;
}

const buttonGroupWrapperStyles: CSSObject = {
  alignItems: 'center',
  'button:first-of-type': {
    '&:focus-visible': {
      outline: '1px solid var(--accent-color-focus)',
    },
    border: '1px solid var(--border-color)',
    borderBottomLeftRadius: 12,
    borderTopLeftRadius: 12,
    paddingLeft: '14px !important',
  },
  'button:last-of-type': {
    '&:focus-visible': {
      outline: '1px solid var(--accent-color-focus)',
    },
    border: '1px solid var(--border-color)',
    borderBottomRightRadius: 12,
    borderTopRightRadius: 12,
    paddingRight: '14px !important',
  },
  display: 'flex',
  justifyContent: 'center',
  minWidth: '145px',
};

const buttonGroupItemStyles: CSSObject = {
  '&:hover': {
    backgroundColor: 'var(--button-group-left-hover)',
  },
  backgroundColor: 'var(--app-bg-secondary)',
  color: 'var(--main-color)',
  cursor: 'pointer',
  fontSize: '0.6875rem',
  fontWeight: 500,
  padding: '10px 12px',
};

const buttonGroupItemActiveStyles: CSSObject = {
  ...buttonGroupItemStyles,
  '&:hover': {
    backgroundColor: 'var(--button-group-right-hover)',
  },
  backgroundColor: 'var(--main-color)',
  color: 'var(--app-bg-secondary)',
};

const ButtonGroup: React.FC<ButtonGroupProps> = ({style, items, currentItem, onChangeItem, textSubstitute}) => {
  return (
    <div css={{...buttonGroupWrapperStyles, ...style}} data-uie-name="button-group-wrapper">
      {items.map(({value, getText}) => (
        <button
          key={value}
          css={value === currentItem ? buttonGroupItemActiveStyles : buttonGroupItemStyles}
          onClick={() => {
            if (value !== currentItem) {
              onChangeItem(value);
            }
          }}
          className="button-reset-default"
          type="button"
          data-uie-name="button-group-item"
          data-uie-value={value === currentItem ? 'active' : 'inactive'}
        >
          {getText(textSubstitute)}
        </button>
      ))}
    </div>
  );
};

export {ButtonGroup};
