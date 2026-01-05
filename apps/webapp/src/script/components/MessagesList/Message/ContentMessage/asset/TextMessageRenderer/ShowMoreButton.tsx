/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {FC, HTMLProps} from 'react';

import cx from 'classnames';

import * as Icon from 'Components/Icon';
import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {t} from 'Util/LocalizerUtil';

interface ShowMoreButtonProps {
  active: boolean;
  isFocusable: boolean;
}

export const ShowMoreButton: FC<ShowMoreButtonProps & HTMLProps<HTMLButtonElement>> = ({
  active,
  isFocusable,
  ...props
}) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);
  return (
    <button
      className="button-reset-default message-quote__text__show-more"
      data-uie-name="do-show-more-quote"
      tabIndex={messageFocusedTabIndex}
      {...props}
      type="button"
    >
      <span>{active ? t('replyQuoteShowLess') : t('replyQuoteShowMore')}</span>
      <Icon.DiscloseIcon
        className={cx('disclose-icon', {
          'upside-down': active,
        })}
      />
    </button>
  );
};
