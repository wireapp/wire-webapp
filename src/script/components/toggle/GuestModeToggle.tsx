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
import {t} from 'Util/LocalizerUtil';

export interface GuestModeToggleProps {
  extendedInfo?: string;
  isChecked: boolean;
  isDisabled?: boolean;
  setIsChecked: (isChecked: boolean) => void;
}

const GuestModeToggle: React.FC<GuestModeToggleProps> = ({extendedInfo, isChecked, isDisabled, setIsChecked}) => {
  return (
    <>
      <div className="info-toggle__row">
        <div>{t('guestRoomToggleName')}</div>
        <div
          className={cx('slider', {
            disabled: isDisabled,
          })}
        >
          <input
            className="slider-input"
            type="checkbox"
            name="toggle"
            id="toggle"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIsChecked(event.target.checked)}
            checked={isChecked}
            data-uie-name="allow-guest-input"
          />
          <label
            className="button-label"
            htmlFor="toggle"
            data-uie-name="do-allow-guests"
            data-uie-value={isChecked ? 'checked' : 'unchecked'}
          />
        </div>
      </div>
      <div className="info-toggle__details" data-uie-name="status-guest-toggle">
        {extendedInfo ? t('guestRoomToggleInfoExtended') : t('guestRoomToggleInfo')}
      </div>
    </>
  );
};

export default GuestModeToggle;

registerReactComponent('guest-mode-toggle', {
  component: GuestModeToggle,
  optionalParams: ['extendedInfo', 'isDisabled'],
  template:
    '<div class="guest-mode-toggle" data-bind="react: {isChecked: ko.unwrap(isChecked), isDisabled: ko.unwrap(isDisabled), setIsChecked: onToggle, extendedInfo}"></div>',
});
