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

export const MAX_AUDIO_BULLETS = 20;

/**
 * Shows bullet indicators to visualize the audio input level.
 *
 * @param disabled Don't show audio level indicator if set to `false`
 * @param level Audio input volume as floating point number, `1.0` is 100%
 */
const InputLevel: React.FC<InputLevelProps> = ({disabled, level}) => {
  const amountOfBullets = Array.from(Array(MAX_AUDIO_BULLETS).keys());

  const isActiveBullet = (bulletIndex: number): string => {
    if (disabled) {
      return 'input-level-bullet-disabled';
    }

    const passedThreshold = level > bulletIndex / amountOfBullets.length;
    if (passedThreshold) {
      return 'input-level-bullet-active';
    }

    return '';
  };

  return (
    <>
      {amountOfBullets.map(bulletIndex => (
        <li key={bulletIndex} className={cx('input-level-bullet', isActiveBullet(bulletIndex))} />
      ))}
    </>
  );
};

export default InputLevel;

registerReactComponent('input-level', {
  component: InputLevel,
  template: '<ul class="input-level" data-bind="react: {disabled: ko.unwrap(disabled), level: ko.unwrap(level)}"></ul>',
});
