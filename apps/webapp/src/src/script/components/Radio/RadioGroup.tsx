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

import {useId} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit';

import {
  radioHintStyles,
  radioInputStyles,
  radioLabelStyles,
  radioOptionHorizontalStyles,
  radioOptionStyles,
} from './RadioGroup.styles';

interface RadioGroupProps<T> {
  ariaLabelledBy: string;
  name: string;
  onChange: (newValue: T) => void;
  options: {
    label: string;
    value: T;
    detailLabel?: string;
    isDisabled?: boolean;
    optionUeiName?: string;
  }[];
  selectedValue: T;
  uieName?: string;
  horizontal?: boolean;
  disabled?: boolean;
}

const RadioGroup = <T extends string | number>({
  ariaLabelledBy,
  name,
  options,
  onChange,
  uieName = name,
  selectedValue,
  horizontal,
  disabled = false,
}: RadioGroupProps<T>) => {
  const radioId = useId();

  return (
    <div
      aria-labelledby={ariaLabelledBy}
      data-uie-name={uieName}
      css={horizontal && radioOptionHorizontalStyles}
      role="radiogroup"
    >
      {options.map(({value, label, detailLabel, isDisabled = false, optionUeiName = `${uieName}-${value}`}) => {
        const currentId = radioId + value;
        const isChecked = selectedValue === value;

        return (
          <div key={value} css={radioOptionStyles} aria-describedby={currentId}>
            <input
              css={radioInputStyles(isDisabled || disabled)}
              disabled={isDisabled || disabled}
              tabIndex={TabIndex.FOCUSABLE}
              type="radio"
              id={currentId}
              name={name}
              value={value}
              onChange={() => onChange(value)}
              checked={isChecked}
              data-uie-name={optionUeiName}
            />

            <label css={radioLabelStyles(isDisabled || disabled)} htmlFor={currentId}>
              <span>{label}</span>

              {detailLabel && isChecked && <span css={radioHintStyles}>{` · ${detailLabel}`}</span>}
            </label>
          </div>
        );
      })}
    </div>
  );
};

export {RadioGroup};
