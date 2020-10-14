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
import type {User} from '../entity/User';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const AccentColorPicker: React.FunctionComponent<AccentColorPickerProps> = ({user, doSetAccentColor}) => {
  const accentColorIds = [1, 2, 4, 5, 6, 7];
  return (
    <span className="accent-color-picker preferences-account-accent-color preferences-section-account-space-before">
      {accentColorIds.map(id => (
        <span key={id} className="accent-color">
          <input
            type="radio"
            name="accent"
            id={`accent${id}`}
            defaultChecked={user.accent_id() === id}
            onClick={() => doSetAccentColor(id)}
            data-uie-name="do-set-accent-color"
            data-uie-value={id}
          />
          <label htmlFor={`accent${id}`} className={`accent-color-${id}`}></label>
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
