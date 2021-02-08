/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export interface InputLevelProps {
  disabled: boolean;
  level: number;
}

/** How many bullets should be displayed */
export const MAX_AUDIO_BULLETS = 20;

/**
 * Shows bullet indicators to visualize the audio input level.
 *
 * @param disabled Show audio meter with disabled bullets if set to `true`
 * @param level Audio input volume as floating point number, `1.0` is 100%
 */
const InputLevel: React.FC<InputLevelProps> = ({disabled, level}) => {
  const bullets = Array.from(Array(MAX_AUDIO_BULLETS).keys());

  return (
    <div className="input-level">
      {bullets.map(bulletIndex => (
        <div
          key={bulletIndex}
          className={cx('input-level__bullet', {
            'input-level__bullet--active': !disabled && level > bulletIndex / MAX_AUDIO_BULLETS,
            'input-level__bullet--disabled': disabled,
          })}
        />
      ))}
    </div>
  );
};

export default InputLevel;

registerReactComponent('input-level', {
  component: InputLevel,
  template: '<div data-bind="react: {disabled: ko.unwrap(disabled), level: ko.unwrap(level)}"></div>',
});
