/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import cx from 'classnames';

export const Placeholder = ({text, hasLocalEphemeralTimer}: {text: string; hasLocalEphemeralTimer: boolean}) => {
  return (
    <div
      className={cx('editor-placeholder', {
        'conversation-input-bar-text--accent': hasLocalEphemeralTimer,
      })}
      data-uie-name="input-placeholder"
    >
      {text}
    </div>
  );
};
