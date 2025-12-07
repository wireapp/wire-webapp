/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {MouseEvent} from 'react';

import cx from 'classnames';
import {t} from 'Util/LocalizerUtil';

import {EmojiIcon} from '@wireapp/react-ui-kit';

interface EmojiButtonProps {
  isActive: boolean;
  isEditing?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const EmojiButton = ({isActive, isEditing = false, onClick}: EmojiButtonProps) => {
  return (
    <button
      className={cx('input-bar-control', {
        active: isActive,
        'input-bar-control--editing': isEditing,
      })}
      type="button"
      onClick={onClick}
      title={t('tooltipConversationEmoji')}
      aria-label={t('tooltipConversationEmoji')}
      data-uie-name="add-emoji"
    >
      <EmojiIcon width={14} height={14} />
    </button>
  );
};
