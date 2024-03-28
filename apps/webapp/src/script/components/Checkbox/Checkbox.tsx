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

import React from 'react';

import {Global} from '@emotion/react';

import {getInputCSS, getInputCSSDark, getLabelCSS, getSvgCSS} from './Checkbox.styles';

interface CheckboxProps {
  disabled?: boolean;
  isChecked: boolean;
  label: string;
  name: string;
  onCheckedChanged: () => void;
  uieName: string;
}

const Checkbox: React.FC<CheckboxProps> = ({disabled, label, isChecked, name, onCheckedChanged, uieName}) => {
  return (
    <>
      <input
        {...(isChecked && {
          className: 'input-dark',
        })}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        aria-checked={isChecked}
        id={name}
        name={name}
        onChange={onCheckedChanged}
        css={getInputCSS(isChecked, disabled)}
      />

      <label
        className="label-base"
        css={getLabelCSS(disabled)}
        htmlFor={name}
        data-uie-name={uieName}
        data-uie-value={isChecked}
      >
        <Global styles={getInputCSSDark(isChecked, disabled)} />

        <svg
          aria-hidden="true"
          css={getSvgCSS(isChecked, disabled)}
          // This element is purely decorative so
          // we hide it for screen readers

          viewBox="0 0 15 11"
          fill="none"
        >
          <path
            d="M1 4.5L5 9L14 1"
            strokeWidth="2"
            stroke={isChecked ? 'var(--app-bg)' : 'none'} // only show the checkmark when `isCheck` is `true`
          />
        </svg>

        {label}
      </label>
    </>
  );
};

export {Checkbox};
