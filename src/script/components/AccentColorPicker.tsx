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
import {CSS_ABSOLUTE_CENTER, CSS_SQUARE} from 'Util/CSSMixin';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const AccentColorPicker: React.FunctionComponent<AccentColorPickerProps> = ({user, doSetAccentColor}) => {
  return (
    <span
      className="preferences-account-accent-color preferences-section-account-space-before"
      css={{
        display: 'inline-flex',
        height: 24,
        justifyContent: 'space-between',
      }}
    >
      {AccentColor.ACCENT_COLORS.map(accentColor => {
        const isChecked = user.accent_id() === accentColor.id;
        return (
          <label
            key={accentColor.id}
            data-uie-name="element-accent-color-label"
            data-uie-value={accentColor.id}
            css={{
              '::after': {
                ...CSS_SQUARE(isChecked ? 16 : 12),
                border: `0px solid ${accentColor.color}`,
                borderWidth: isChecked ? 1 : 0,
              },
              '::before': {
                ...CSS_SQUARE(isChecked ? 10 : 6),
                backgroundColor: accentColor.color,
              },
              '::before, ::after': {
                ...CSS_ABSOLUTE_CENTER,
                borderRadius: '50%',
                content: '""',
                transition: 'all 0.15s ease-out',
              },
              cursor: 'pointer',
              position: 'relative',
              width: 16,
            }}
          >
            <input
              type="radio"
              name="accent"
              checked={isChecked}
              onChange={() => doSetAccentColor(accentColor.id)}
              data-uie-name="do-set-accent-color"
              data-uie-value={accentColor.id}
              css={{
                opacity: 0,
                position: 'absolute',
              }}
            />
          </label>
        );
      })}
    </span>
  );
};

export default AccentColorPicker;

registerReactComponent('accent-color-picker', {
  component: AccentColorPicker,
  template: '<span data-bind="react: {user: ko.unwrap(user), doSetAccentColor: selected}"></span>',
});
