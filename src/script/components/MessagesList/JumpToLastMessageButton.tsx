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

import {HTMLProps} from 'react';

import {ChevronIcon, IconButton} from '@wireapp/react-ui-kit';

import {
  jumpToLastMessageButtonStyles,
  jumpToLastMessageChevronStyles,
} from 'Components/MessagesList/MessageList.styles';
import {t} from 'Util/LocalizerUtil';

export interface JumpToLastMessageButtonProps extends HTMLProps<HTMLElement> {
  onGoToLastMessage: () => void;
}

export const JumpToLastMessageButton = ({onGoToLastMessage}: JumpToLastMessageButtonProps) => {
  return (
    <IconButton
      aria-label={t('jumpToLastMessage')}
      data-uie-name="jump-to-last-message-button"
      onClick={onGoToLastMessage}
      css={jumpToLastMessageButtonStyles}
    >
      <ChevronIcon css={jumpToLastMessageChevronStyles} />
    </IconButton>
  );
};
