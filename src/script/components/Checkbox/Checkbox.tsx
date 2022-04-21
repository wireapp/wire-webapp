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

interface CheckboxProps {
  disabled?: boolean;
  isChecked: boolean;
  label: string;
  name: string;
  onCheckedChanged: () => void;
}

const Checkbox: React.FC<CheckboxProps> = ({disabled, label, isChecked, name, onCheckedChanged}) => {
  return (
    <label
      htmlFor={name}
      css={{
        '&:hover': {
          cursor: !disabled && 'pointer',
        },
        '&:hover svg': {
          borderColor: !disabled && 'var(--checkbox-border-hover)',
        },
        alignItems: 'center',
        display: 'flex',
      }}
    >
      <input
        disabled={disabled}
        type="checkbox"
        id={name}
        name={name}
        onChange={onCheckedChanged}
        css={{
          '&:active + svg, &:focus + svg, &:focus-visible + svg': {
            borderColor: !disabled && 'var(--checkbox-border-hover)',
          },
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          height: 1,
          overflow: 'hidden',
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: 1,
        }}
      />
      <svg
        css={{
          background: 'var(--checkbox-background)',
          border: '1.5px var(--checkbox-border) solid',
          borderRadius: 3,

          // set to `inline-block` as `inline elements ignore `height` and `width`
          display: 'inline-block',
          height: 20,
          marginRight: 4,
          width: 20,
          ...(isChecked && {
            background: 'var(--checkbox-background-selected)',
            borderColor: 'var(--checkbox-background-selected)',
          }),
          ...(disabled && {
            background: isChecked
              ? 'var(--checkbox-background-disabled-selected)'
              : 'var(--checkbox-background-disabled)',
            borderColor: 'var(--checkbox-border-disabled)',
            pointerEvents: 'none',
          }),
        }}
        // This element is purely decorative so
        // we hide it for screen readers
        aria-hidden="true"
        viewBox="0 0 15 11"
        fill="none"
      >
        <path
          d="M1 4.5L5 9L14 1"
          strokeWidth="2"
          stroke={isChecked ? 'var(--white)' : 'none'} // only show the checkmark when `isCheck` is `true`
        />
      </svg>
      {label}
    </label>
  );
};

export default Checkbox;
