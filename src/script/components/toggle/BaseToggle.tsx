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

import React from 'react';
import cx from 'classnames';

import {registerReactComponent} from 'Util/ComponentUtil';
import {createRandomUuid} from 'Util/util';

export interface BaseToggleProps {
  extendedInfo?: string;
  extendedInfoText?: string;
  infoText?: string;
  isChecked: boolean;
  isDisabled?: boolean;
  setIsChecked: (isChecked: boolean) => void;
  toggleId?: string;
  toggleName?: string;
}

const defaultToggleName = 'base-toggle';

const BaseToggle: React.FC<BaseToggleProps> = ({
  extendedInfo,
  isChecked,
  isDisabled,
  setIsChecked,
  extendedInfoText,
  toggleId = defaultToggleName,
  toggleName = defaultToggleName,
  infoText,
}) => {
  const uuid = React.useMemo(() => createRandomUuid(), []);
  const labelUuid = React.useMemo(() => createRandomUuid(), []);
  const inputRef = React.useRef<HTMLInputElement>();
  return (
    <div className={defaultToggleName}>
      <div className="info-toggle__row">
        <label htmlFor={uuid} id={labelUuid} className="info-toggle__name">
          {toggleName}
        </label>
        <div
          className={cx('slider', {
            disabled: isDisabled,
          })}
        >
          <input
            ref={inputRef}
            className="slider-input"
            type="checkbox"
            name="toggler"
            id={uuid}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIsChecked(event.target.checked)}
            checked={isChecked}
            data-uie-name={`allow-${toggleId}-input`}
          />
          <button
            className="button-label"
            aria-pressed={isChecked}
            type="button"
            onClick={() => setIsChecked(inputRef.current.checked)}
            data-uie-name={`do-allow-${toggleId}`}
            data-uie-value={isChecked ? 'checked' : 'unchecked'}
          >
            <span className="button-label__switch" />
            <span className="visually-hidden">{toggleName}</span>
          </button>
        </div>
      </div>
      <p className="info-toggle__details" data-uie-name={`status-${toggleId}`}>
        {extendedInfo ? extendedInfoText : infoText}
      </p>
    </div>
  );
};

export default BaseToggle;

registerReactComponent('base-toggle', BaseToggle);
