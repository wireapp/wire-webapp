/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {registerReactComponent} from 'Util/ComponentUtil';
import {AccentColor} from '@wireapp/commons';
import type {User} from '../entity/User';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const AccentColorPicker: React.FunctionComponent<AccentColorPickerProps> = ({user, doSetAccentColor}) => {
  return (
    <span className="accent-color-picker preferences-account-accent-color preferences-section-account-space-before">
      {AccentColor.ACCENT_COLORS.map(accentColor => (
        <span key={accentColor.id} className="accent-color">
          <input
            type="radio"
            name="accent"
            id={`accent${accentColor.id}`}
            checked={user.accent_id() === accentColor.id}
            onChange={() => doSetAccentColor(accentColor.id)}
            data-uie-name="do-set-accent-color"
            data-uie-value={accentColor.id}
          />
          <label htmlFor={`accent${accentColor.id}`} className={`accent-color-${accentColor.id}`}></label>
        </span>
      ))}
    </span>
  );
};

export default AccentColorPicker;

registerReactComponent('accent-color-picker', {
  component: AccentColorPicker,
  template: '<span data-bind="react: {user: user(), doSetAccentColor: selected}"></span>',
});
