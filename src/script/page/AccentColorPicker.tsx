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
import {AccentColor} from '@wireapp/commons';

import {registerReactComponent} from 'Util/ComponentUtil';
import {CSS_SQUARE} from 'Util/CSSMixin';
import {t} from 'Util/LocalizerUtil';

import type {User} from '../entity/User';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const AccentColorPicker: React.FunctionComponent<AccentColorPickerProps> = ({user, doSetAccentColor}) => {
  return (
    <fieldset css={{border: 'none', margin: 0, padding: 0}} aria-label={t('chooseAccountColor')}>
      <div
        className="preferences-account-accent-color"
        css={{
          alignItems: 'center',
          display: 'inline-flex',
          height: 24,
          justifyContent: 'space-between',
        }}
      >
        {AccentColor.ACCENT_COLORS.map(accentColor => {
          const isChecked = user.accent_id() === accentColor.id;

          return (
            <div
              data-uie-name="element-accent-color-label"
              data-uie-value={accentColor.id}
              key={accentColor.color}
              css={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <input
                id={accentColor.color}
                type="radio"
                name="accent"
                aria-label={accentColor.name}
                checked={isChecked}
                onChange={() => doSetAccentColor(accentColor.id)}
                data-uie-name="do-set-accent-color"
                data-uie-value={accentColor.id}
                css={{
                  '& + span': {
                    cursor: 'pointer',
                    display: 'inline-block',
                    position: 'relative',
                  },
                  '& + span::after': {
                    ...CSS_SQUARE(isChecked ? 10 : 6),
                    background: accentColor.color,
                    left: '-10px',
                    top: '-3px',
                  },
                  '& + span::before': {
                    ...CSS_SQUARE(isChecked ? 16 : 12),
                    left: '-15px',
                    top: '-8px',
                  },
                  '& + span::before, & + span::after': {
                    borderRadius: '50%',
                    content: '""',
                    display: 'inline-block',
                    position: 'absolute',
                    transition: 'all 0.15s ease-out',
                  },
                  '&:checked + span::after': {
                    left: '-12px',
                    top: '-5px',
                  },
                  '&:checked + span::before': {
                    border: `1px solid ${accentColor.color}`,
                  },
                  '&:focus + span::before': {
                    ...CSS_SQUARE(16),
                    outline: '1px solid Highlight',
                  },
                  opacity: 0,
                }}
              />
              <span onClick={() => doSetAccentColor(accentColor.id)} />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};

export default AccentColorPicker;

registerReactComponent('accent-color-picker', {
  component: AccentColorPicker,
  template: '<span data-bind="react: {user: ko.unwrap(user), doSetAccentColor: selected}"></span>',
});
