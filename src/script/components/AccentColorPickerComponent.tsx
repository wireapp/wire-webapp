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

interface Props {
  setSelected: (id: number) => void;
  user: User;
}

export const AccentColorPicker: React.FunctionComponent<Props> = ({user, setSelected}) => {
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
            onClick={() => setSelected(id)}
          />
          <label htmlFor={`accent${id}`} className={`accent-color-${id}`}></label>
        </span>
      ))}
    </span>
  );
};

registerReactComponent('accent-color-picker', {
  component: AccentColorPicker,
  template: '<span data-bind="react: {user: user(), setSelected: selected}"></span>',
});
