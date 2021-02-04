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

const InputLevel: React.FC<InputLevelProps> = ({disabled, level}) => {
  const bulletCount = Array.from(Array(20).keys());

  const isBulletActive = (index: number): string => {
    if (disabled) {
      return 'input-level-bullet-disabled';
    }

    const passedThreshold = level > (index + 1) / bulletCount.length;
    if (passedThreshold) {
      return 'input-level-bullet-active';
    }

    return '';
  };

  return (
    <>
      {bulletCount.map(count => (
        <li key={count} className={cx('input-level-bullet', isBulletActive(count))} />
      ))}
    </>
  );
};

registerReactComponent('input-level', {
  component: InputLevel,
  template: '<ul class="input-level" data-bind="react: {disabled: ko.unwrap(disabled), level: ko.unwrap(level)}"></ul>',
});
