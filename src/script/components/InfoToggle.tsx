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

import React, {Fragment} from 'react';
import {createRandomUuid} from 'Util/util';
import cx from 'classnames';
import {registerReactComponent} from 'Util/ComponentUtil';

export interface InfoToggleProps {
  dataUieName: string;
  info: string;
  isChecked: boolean;
  isDisabled: boolean;
  name: string;
  setIsChecked: (checked: boolean) => void;
}

const InfoToggle: React.FC<InfoToggleProps> = ({dataUieName, info, isChecked, isDisabled, name, setIsChecked}) => {
  const dataUieNameInfoText = `status-info-toggle-${dataUieName}`;
  const dataUieNameLabelText = `do-toggle-${dataUieName}`;
  const {current: inputId} = React.useRef(createRandomUuid());

  return (
    <Fragment>
      <div className="info-toggle__row">
        <div>{name}</div>
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
          <label
            htmlFor={inputId}
            className="button-label"
            data-uie-name={dataUieNameLabelText}
            data-uie-value={isChecked ? 'checked' : 'unchecked'}
          />
        </div>
      </div>
      <div className="info-toggle__details" data-uie-name={dataUieNameInfoText}>
        {info}
      </div>
    </Fragment>
  );
};

export default InfoToggle;

registerReactComponent('info-toggle', {
  component: InfoToggle,
  template:
    '<div data-bind="react: {isChecked: ko.unwrap(isChecked), setIsChecked: isChecked, dataUieName, info, isDisabled, name}"></div>',
});
