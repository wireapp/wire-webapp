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
  isChecked: boolean;
  label: string;
  name: string;
  onCheckedChanged: () => void;
}

const Checkbox: React.FC<CheckboxProps> = ({label, isChecked, name, onCheckedChanged}) => {
  return (
    <label
      htmlFor={name}
      css={{
        '&:hover': {
          cursor: 'pointer',
        },
      }}
    >
      <input
        type="checkbox"
        id={name}
        name={name}
        onChange={onCheckedChanged}
        css={{
          '&:active + svg': {
            outline: '1px solid Highlight',
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
          background: '#fff',
          border: '2px #ddd solid',

          display: 'inline-block',
          // set to `inline-block` as `inline elements ignore `height` and `width`
          height: 20,
          marginRight: 4,
          width: 20,
          ...(isChecked && {
            background: 'purple',
            borderColor: 'purple',
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
          stroke={isChecked ? '#fff' : 'none'} // only show the checkmark when `isCheck` is `true`
        />
      </svg>
      {label}
    </label>
  );
};

export default Checkbox;
