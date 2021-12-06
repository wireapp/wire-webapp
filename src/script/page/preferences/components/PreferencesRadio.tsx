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

import React, {Fragment, useRef} from 'react';

interface PreferencesRadioProps {
  name: string;
  onChange: (newValue: string) => void;
  options: {
    detailLabel?: string;
    label: string;
    value: string;
  }[];
  selectedValue: string;
  uieName?: string;
}

const PreferencesRadio: React.FC<PreferencesRadioProps> = ({
  name,
  selectedValue,
  options,
  onChange,
  uieName = name,
}) => {
  const {current: id} = useRef(Math.random().toString(36).substr(2));

  return (
    <div className="preferences-option">
      <div className="preferences-options-radio" data-uie-name={uieName}>
        {options.map(({value, label, detailLabel}) => (
          <Fragment key={value}>
            <input
              type="radio"
              id={id + value}
              name={name}
              value={value}
              onChange={() => onChange(value)}
              checked={selectedValue === value}
              data-uie-name={`${uieName}-${value}`}
            />
            <label htmlFor={id + value}>
              <span className="preferences-label">{label}</span>
              {detailLabel && selectedValue === value && (
                <span className="preferences-hint">{` · ${detailLabel}`}</span>
              )}
            </label>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default PreferencesRadio;
