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

import React, {useId} from 'react';

import cx from 'classnames';

interface InfoToggleProps {
  dataUieName: string;
  info: string;
  isChecked: boolean;
  isDisabled: boolean;
  name: string;
  className?: string;
  setIsChecked: (checked: boolean) => void;
}

const InfoToggle: React.FC<InfoToggleProps> = ({
  dataUieName,
  className = '',
  info,
  isChecked,
  isDisabled,
  name,
  setIsChecked,
}) => {
  const dataUieNameInfoText = `status-info-toggle-${dataUieName}`;
  const dataUieNameLabelText = `do-toggle-${dataUieName}`;
  const inputId = useId();

  return (
    <div className={cx('info-toggle', className)}>
      <div className="info-toggle__row">
        <div>
          <label htmlFor={inputId} className="heading-h3">
            {name}
          </label>
          <p className="info-toggle__details" data-uie-name={dataUieNameInfoText}>
            {info}
          </p>
        </div>
        <div className={cx('slider', {disabled: isDisabled})}>
          <input
            className="slider-input"
            name={inputId}
            id={inputId}
            checked={isChecked}
            onChange={event => setIsChecked(event.target.checked)}
            type="checkbox"
            data-uie-name="info-toggle-input"
          />
          <button
            className="button-label"
            aria-pressed={isChecked}
            onClick={() => setIsChecked(!isChecked)}
            data-uie-name={dataUieNameLabelText}
            data-uie-value={isChecked ? 'checked' : 'unchecked'}
          >
            <span className="button-label__switch" />
            <span className="visually-hidden">{name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export {InfoToggle};
