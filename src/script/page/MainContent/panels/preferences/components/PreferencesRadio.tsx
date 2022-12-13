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

interface PreferencesRadioProps<T> {
  name: string;
  onChange: (newValue: T) => void;
  options: {
    detailLabel?: string;
    label: string;
    value: T;
  }[];
  selectedValue: T;
  uieName?: string;
  ariaLabelledBy: string;
}

const PreferencesRadio = <T extends string | number>({
  name,
  selectedValue,
  options,
  onChange,
  uieName = name,
  ariaLabelledBy,
}: PreferencesRadioProps<T>) => {
  const {current: id} = useRef(Math.random().toString(36).slice(2));

  return (
    <div className="preferences-option">
      <div className="preferences-options-radio" data-uie-name={uieName}>
        {options.map(({value, label, detailLabel}) => {
          const currentId = id + value;

          return (
            <div
              key={value}
              className="preferences-options-radio-option"
              role="radiogroup"
              aria-labelledby={ariaLabelledBy}
              aria-describedby={currentId}
            >
              <input
                tabIndex={0}
                type="radio"
                id={currentId}
                name={name}
                value={value}
                onChange={() => onChange(value)}
                checked={selectedValue === value}
                data-uie-name={`${uieName}-${value}`}
              />

              <label htmlFor={currentId}>
                <span>{label}</span>

                {detailLabel && selectedValue === value && (
                  <span className="preferences-hint">{` · ${detailLabel}`}</span>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export {PreferencesRadio};
