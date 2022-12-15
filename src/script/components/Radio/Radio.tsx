/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useRef} from 'react';

import {radioHintStyles, radioInputStyles, radioLabelStyles, radioOptionStyles} from './Radio.styles';

interface RadioProps<T> {
  ariaLabelledBy: string;
  name: string;
  onChange: (newValue: T) => void;
  options: {
    label: string;
    value: T;
    detailLabel?: string;
    isDisabled?: boolean;
  }[];
  selectedValue: T;
  uieName?: string;
}

const Radio = <T extends string | number>({
  ariaLabelledBy,
  name,
  options,
  onChange,
  uieName = name,
  selectedValue,
}: RadioProps<T>) => {
  const {current: id} = useRef(Math.random().toString(36).slice(2));

  return (
    <div data-uie-name={uieName}>
      {options.map(({value, label, detailLabel, isDisabled = false}) => {
        const currentId = id + value;

        return (
          <div
            key={value}
            css={radioOptionStyles}
            role="radiogroup"
            aria-labelledby={ariaLabelledBy}
            aria-describedby={currentId}
          >
            <input
              css={radioInputStyles(isDisabled)}
              disabled={isDisabled}
              tabIndex={0}
              type="radio"
              id={currentId}
              name={name}
              value={value}
              onChange={() => onChange(value)}
              checked={selectedValue === value}
              data-uie-name={`${uieName}-${value}`}
            />

            <label css={radioLabelStyles(isDisabled)} htmlFor={currentId}>
              <span>{label}</span>

              {detailLabel && selectedValue === value && <span css={radioHintStyles}>{` · ${detailLabel}`}</span>}
            </label>
          </div>
        );
      })}
    </div>
  );
};

export {Radio};
